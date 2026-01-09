import '../../src/utils/polyfill'
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { initDatabase } from '../../src/db/init'
import { db } from '../../src/db/client'
import { OR } from '../../src/db/schema'
import { electricSync } from '../../src/services/ShapeStream'
import { desc } from 'drizzle-orm'

// Initialize DB on start
initDatabase()

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([])

  // Start Sync Services
  useEffect(() => {
    electricSync.start()
    return () => electricSync.stop()
  }, [])

  // Polling for updates (Simple reactivity for now since op-sqlite hooks need setup)
  const refreshItems = useCallback(async () => {
    try {
      const results = await db.select().from(OR).orderBy(desc(OR.ts))
      setItems(results)
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => {
    refreshItems()
    // Poll more frequently to catch local updates quickly
    const interval = setInterval(refreshItems, 1000)
    return () => clearInterval(interval)
  }, [refreshItems])

  const handleAddPress = () => {
    router.push('/add-memory')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Working Memories</Text>
        <Text style={styles.subtitle}>{items.length} items • Offline Ready</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {items.map((item) => {
          let content = 'Unknown Payload'
          try {
            const parsed = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload
            content = parsed.text || JSON.stringify(parsed)
          } catch (e) { content = String(item.payload) }

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardId}>ID: {item.id.slice(0, 8)}</Text>
                <View style={[styles.badge, { backgroundColor: item.synced ? '#D1FAE5' : '#F3F4F6' }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.cardBody}>{content}</Text>
              <Text style={styles.cardFooter}>{new Date(item.ts).toLocaleString()}</Text>
            </View>
          )
        })}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    paddingBottom: 100,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 100,
  },
})
