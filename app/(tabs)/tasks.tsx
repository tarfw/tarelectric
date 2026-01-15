import '../../src/utils/polyfill'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  Pressable,
  Alert,
} from 'react-native'
import { TaskItemCard } from '../../src/components/TaskItemCard'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { initDatabase } from '../../src/db/init'
import { db, opsqlite } from '../../src/db/client'
import { OR } from '../../src/db/schema'
import { electricSync } from '../../src/services/ShapeStream'
import { syncService } from '../../src/services/SyncService'
import { vectorStore } from '../../src/services/VectorStore'
import { embeddingService } from '../../src/services/EmbeddingService'
import { desc, inArray } from 'drizzle-orm'

// Initialize DB on start
// initDatabase() moved to _layout.tsx

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, embedded: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const insets = useSafeAreaInsets()

  const updateStats = useCallback(async () => {
    const s = await vectorStore.getStats()
    setStats(s)
  }, [])

  const searchInputRef = useRef<TextInput>(null)

  // Start Sync Services
  useEffect(() => {
    electricSync.start()
    return () => electricSync.stop()
  }, [])

  // Listen for TabBar search trigger
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('TRIGGER_SEARCH_ACTION', () => {
      searchInputRef.current?.focus()
    })
    return () => sub.remove()
  }, [])

  // 1. Load All Items (Default)
  const loadAllItems = useCallback(async () => {
    try {
      const results = await db.select().from(OR).orderBy(desc(OR.ts))
      setItems(results)
      updateStats()
    } catch (e: any) {
      console.error('Load Error:', e)
    }
  }, [updateStats])

  // 2. Perform Vector Search
  const performSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setIsSearching(false)
      loadAllItems()
      return
    }

    setIsSearching(true)
    try {
      // Generate embedding for query
      const queryVector = await embeddingService.embed(text)

      // Get similar IDs from Vector Store
      const searchResults = await vectorStore.search(queryVector, 10) // Top 10
      console.log(`[UI] Search returned ${searchResults.length} results`);

      const ids = searchResults.map((r: any) => r.doc_id)
      console.log(`[UI] Search IDs:`, ids);

      const distanceMap = new Map(searchResults.map((r: any) => [r.doc_id, r.score]))

      if (ids.length === 0) {
        setItems([]) // No matches
      } else {
        const dbItems = await db.select().from(OR).where(inArray(OR.id, ids))
        console.log(`[UI] DB matched ${dbItems.length} items from OR table`);

        const sortedItems = dbItems
          .map(item => ({
            ...item,
            distance: Number(distanceMap.get(item.id) ?? 0)
          }))
          .sort((a, b) => {
            const scoreA = a.distance;
            const scoreB = b.distance;
            return scoreB - scoreA;
          });

        setItems(sortedItems)
      }
    } catch (e) {
      console.error('Search Error:', e)
    } finally {
      setIsSearching(false)
    }
  }, [loadAllItems])

  // Poll for updates ONLY if not searching
  useEffect(() => {
    if (searchQuery) return

    loadAllItems()
    const interval = setInterval(() => {
      if (!searchQuery) {
        loadAllItems()
      } else {
        updateStats()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [searchQuery, loadAllItems, updateStats])

  const [isRebuilding, setIsRebuilding] = useState(false)

  const handleRebuildIndex = useCallback(async () => {
    if (isRebuilding) return
    setIsRebuilding(true)
    try {
      console.log('[UI] Starting Index Rebuild...')
      await vectorStore.clear()
      const allItems = await db.select().from(OR)
      console.log(`[UI] Found ${allItems.length} items to re-index`)

      let count = 0
      for (const item of allItems) {
        if (!item.payload) continue

        try {
          const textContent = typeof item.payload === 'string'
            ? item.payload
            : JSON.stringify(item.payload)

          const vector = await embeddingService.embed(textContent)
          await vectorStore.addDocument(item.id, vector, textContent)
          count++
          if (count % 10 === 0) setStats(await vectorStore.getStats())
        } catch (e) {
          console.error(`[UI] Failed to re-index item ${item.id}`, e)
        }
      }

      console.log(`[UI] Rebuild complete. Processed ${count} items.`)
      updateStats()
    } catch (e) {
      console.error('[UI] Rebuild Failed', e)
    } finally {
      setIsRebuilding(false)
    }
  }, [updateStats, isRebuilding])


  const handleClearAll = () => {
    Alert.alert(
      'Clear All Local Data?',
      'This will delete all memories from your phone. If they exist on the server, they might re-sync.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[UI] Resetting Database...')

              // 0. Iterate and Enqueue Deletes for SyncService (to clean remote)
              const allItems = await db.select().from(OR)
              console.log(`[UI] Syncing delete for ${allItems.length} items...`)
              for (const item of allItems) {
                await syncService.enqueueMutation('OR', 'DELETE', { id: item.id })
              }

              // 1. Clear Vector Store
              await vectorStore.clear()
              // 2. Clear OR Table
              await opsqlite.executeAsync('DELETE FROM "OR"')
              // 3. Reset State
              setItems([])
              setStats({ total: 0, embedded: 0 })
              Alert.alert('Success', 'Databases wiped. Remote deletes queued.')
            } catch (e) {
              console.error('Reset Failed', e)
              Alert.alert('Error', 'Failed to clear database.')
            }
          }
        }
      ]
    )
  }



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Operation Selector Modal */}


      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Workspace</Text>
          <TouchableOpacity onPress={handleClearAll} style={styles.headerAddBtn}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
        {/* ... Rest of Header ... */}
        <TouchableOpacity onPress={handleRebuildIndex} disabled={isRebuilding}>
          <Text style={styles.subtitle}>
            total: {stats.total} • embedded: {stats.embedded} • {
              isRebuilding ? 'Rebuilding...' :
                (searchQuery ? 'Semantic Search' : 'Rebuild Index')
            }
          </Text>
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search memories..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text)
              if (text === '') loadAllItems()
            }}
            onSubmitEditing={() => performSearch(searchQuery)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('')
              loadAllItems()
            }}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Searching semantic vector index...</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {items.map((item, index) => (
            <View key={item.id} style={styles.feedItem}>
              {index > 0 && <View style={styles.divider} />}
              <TaskItemCard item={item} />
            </View>
          ))}
          {items.length === 0 && (
            <Text style={styles.emptyText}>No memories found.</Text>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24, // Matches header padding
    paddingBottom: 120,
    paddingTop: 12,
  },
  feedItem: {
    marginBottom: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
    width: '100%',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9CA3AF',
    fontSize: 16,
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  modalCancel: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  headerAddBtn: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
})
