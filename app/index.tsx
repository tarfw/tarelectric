import '../src/utils/polyfill'
import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { initDatabase } from '../src/db/init'
import { db } from '../src/db/client'
import { OR } from '../src/db/schema'
import { syncService } from '../src/services/SyncService'
import { desc } from 'drizzle-orm'
import RandomUUID from 'react-native-random-uuid'

// Initialize DB on start
initDatabase()

export default function HomeScreen() {
  const [items, setItems] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

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
    const interval = setInterval(refreshItems, 2000) // Poll every 2s
    return () => clearInterval(interval)
  }, [refreshItems])

  const handleAddMemory = async () => {
    if (!input.trim()) return

    const newMemory = {
      id: RandomUUID.v4(),
      streamId: 'default-stream',
      opcode: 1, // 1 = text content
      payload: JSON.stringify({ text: input }), // Store as JSON string
      scope: 'private',
      status: 'active',
      ts: new Date(),
    }

    try {
      // 1. Write to local DB immediately
      await db.insert(OR).values(newMemory)

      // 2. Queue for Sync
      await syncService.enqueueMutation('OR', 'INSERT', newMemory)

      setInput('')
      refreshItems()
    } catch (e) {
      console.error('Failed to add memory:', e)
      alert('Failed to save memory')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Working Memories</Text>
        <Text style={styles.subtitle}>{items.length} items • Offline Ready</Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {items.map((item) => {
          let content = 'Unknown Payload'
          try {
            const parsed = JSON.parse(item.payload)
            content = parsed.text || JSON.stringify(parsed)
          } catch (e) { content = item.payload }

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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputWrapper}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="New memory..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={handleAddMemory} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  inputWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563EB',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
})

