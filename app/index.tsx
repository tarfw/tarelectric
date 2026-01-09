import '../src/utils/polyfill' // Load polyfill first
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { useLiveQuery } from '@tanstack/react-db'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '../src/utils/supabase'
import { selectTodoSchema } from '../src/db/schema'
import { electricCollectionOptions } from '@tanstack/electric-db-collection'
import { createCollection } from '@tanstack/react-db'
import { parseISO } from 'date-fns'

// --- Configuration ---

// Config for ElectricSQL Sync
const todoCollection = createCollection(
  electricCollectionOptions({
    id: `todos`,
    schema: selectTodoSchema,
    shapeOptions: {
      url: `${process.env.EXPO_PUBLIC_ELECTRIC_URL}/v1/shape`,
      params: {
        table: `todos`,
        source_id: process.env.EXPO_PUBLIC_ELECTRIC_SOURCE_ID,
        secret: process.env.EXPO_PUBLIC_ELECTRIC_SOURCE_SECRET,
      },
      parser: {
        timestamptz: (date: string) => parseISO(date),
      },
    },
    // Direct Writes to Supabase
    onInsert: async ({ transaction }) => {
      const { id, ...data } = transaction.mutations[0].modified
      const { error } = await supabase.from('todos').insert(data)
      if (error) {
        console.error("Supabase Insert Error", error)
        throw error
      }
      return { txid: Date.now() }
    },
    onUpdate: async ({ transaction }) => {
      const { original: { id }, changes } = transaction.mutations[0]
      const { error } = await supabase.from('todos').update(changes).eq('id', id)
      if (error) throw error
      return { txid: Date.now() }
    },
    onDelete: async ({ transaction }) => {
      const { id } = transaction.mutations[0].original
      const { error } = await supabase.from('todos').delete().eq('id', id)
      if (error) throw error
      return { txid: Date.now() }
    },
    getKey: (item) => item.id,
  })
)

// --- UI Components ---

export default function HomeScreen() {
  const [newTodoText, setNewTodoText] = useState(``)
  const { data: todos, isLoading } = useLiveQuery((q) => q.from({ todoCollection }))

  // Sort todos: pending first, then completed. Newest first.
  const sortedTodos = todos?.slice().sort((a, b) => {
    if (a.completed === b.completed) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    return a.completed ? 1 : -1
  }) || []

  const handleAddTodo = () => {
    if (newTodoText.trim().length === 0) return
    todoCollection.insert({
      id: Math.floor(Math.random() * 100000000), // Temp ID
      text: newTodoText.trim(),
      completed: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    setNewTodoText(``)
  }

  const toggleTodo = (todo: any) => {
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed
      draft.updated_at = new Date()
    })
  }

  const deleteTodo = (id: number) => {
    todoCollection.delete(id)
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header Area */}
      <View style={styles.header}>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.subtitle}>{isLoading ? 'Syncing...' : `${sortedTodos.filter(t => !t.completed).length} pending`}</Text>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sortedTodos.map((item) => (
          <View key={item.id} style={styles.todoItem}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleTodo(item)}
              style={[styles.checkboxBase, item.completed && styles.checkboxChecked]}
            >
              {item.completed && <View style={styles.checkboxCheck} />}
            </TouchableOpacity>

            <View style={styles.todoTextContainer}>
              <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>
                {item.text}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => deleteTodo(item.id)}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputWrapper}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={newTodoText}
            onChangeText={setNewTodoText}
            placeholder="Add a new task..."
            placeholderTextColor="#999"
            onSubmitEditing={handleAddTodo}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={handleAddTodo}
            style={[styles.addButton, { opacity: newTodoText ? 1 : 0.5 }]}
            disabled={!newTodoText}
          >
            <Text style={styles.addButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white for flat list
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 24,
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827', // Almost black
    letterSpacing: -0.5,
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 0, // Align with header text
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkboxBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkboxChecked: {
    backgroundColor: '#111827', // Black accent
    borderColor: '#111827',
  },
  checkboxCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  todoTextContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  todoTextCompleted: {
    color: '#D1D5DB',
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
    color: '#E5E7EB', // Subtle delete icon, pop on hover not relevant for mobile/touch
    fontWeight: '300',
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
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    // Floating shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: -2
  },
})
