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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { initDatabase } from '../../src/db/init'
import { db } from '../../src/db/client'
import { OR } from '../../src/db/schema'
import { electricSync } from '../../src/services/ShapeStream'
import { vectorStore } from '../../src/services/VectorStore' // Import VectorStore
import { embeddingService } from '../../src/services/EmbeddingService' // Import EmbeddingService
import { desc, inArray } from 'drizzle-orm'

// Initialize DB on start
initDatabase()

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, embedded: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

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

      const ids = searchResults.map((r: any) => r.doc_id) // Note: key is doc_id not id in vector store?
      console.log(`[UI] Search IDs:`, ids);

      const distanceMap = new Map(searchResults.map((r: any) => [r.doc_id, r.score])) // Use score as distance/similarity

      if (ids.length === 0) {
        setItems([]) // No matches
      } else {
        // Fetch full objects from DB for these IDs
        // Note: Drizzle's `inArray` might need non-empty array
        const dbItems = await db.select().from(OR).where(inArray(OR.id, ids))
        console.log(`[UI] DB matched ${dbItems.length} items from OR table`);

        // Attach distance AND Sort by distance (DESC) for similarity
        const sortedItems = dbItems
          .map(item => ({
            ...item,
            distance: Number(distanceMap.get(item.id) ?? 0) // Attach score
          }))
          .sort((a, b) => {
            const scoreA = a.distance;
            const scoreB = b.distance;
            return scoreB - scoreA; // Descending: Higher score = Better match
          });

        setItems(sortedItems)
      }
    } catch (e) {
      console.error('Search Error:', e)
    } finally {
      setIsSearching(false)
    }
  }, [loadAllItems])

  // Debounced Search or Manual Trigger? 
  // For simplicity, we search on submit or with a small debounce if desired. 
  // Let's do onChange for now with a slight natural delay effect (user stops typing)
  // or just a submit button. Let's do onSubmitEditing for clarity.

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Workspace</Text>
        </View>
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
          {items.map((item) => {
            let content = 'Unknown Payload'
            try {
              const parsed = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload
              // DEBUG: Show full JSON as requested
              content = JSON.stringify(parsed, null, 2)
            } catch (e) { content = String(item.payload) }

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => router.push(`/memory/${item.id}`)}
              >
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.streamId}>{item.streamId}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {item.delta !== null && item.delta !== undefined && item.delta !== 0 && (
                        <View style={[styles.badge, { backgroundColor: item.delta > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                          <Text style={[styles.badgeText, { color: item.delta > 0 ? '#166534' : '#991B1B' }]}>
                            {item.delta > 0 ? '+' : ''}{item.delta}
                          </Text>
                        </View>
                      )}
                      {item.distance !== undefined && (
                        <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                          <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
                            dist: {Number(item.distance).toFixed(4)}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.badge, { backgroundColor: item.synced ? '#D1FAE5' : '#F3F4F6' }]}>
                        <Text style={styles.badgeText}>{item.status}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.cardBody}>{content}</Text>
                  <Text style={styles.cardFooter}>{new Date(item.ts).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
          {items.length === 0 && (
            <Text style={styles.emptyText}>No memories found.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerAddBtn: {
    padding: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
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
    padding: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardId: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#9CA3AF',
  },
  streamId: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 2,
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  cardBody: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  cardFooter: {
    marginTop: 12,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#9CA3AF',
    fontSize: 16,
  },
})
