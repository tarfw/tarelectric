import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import * as Crypto from 'expo-crypto'
import { db } from '../src/db/client'
import { OR } from '../src/db/schema'
import { syncService } from '../src/services/SyncService'

export default function AddMemoryScreen() {
    const [content, setContent] = useState('')
    const [scope, setScope] = useState('private')
    const [status, setStatus] = useState('active')
    const [loading, setLoading] = useState(false)

    const handleSave = async () => {
        if (!content.trim()) {
            alert('Content is required')
            return
        }

        setLoading(true)
        try {
            const newMemory = {
                id: Crypto.randomUUID(),
                streamId: 'default-stream',
                opcode: 1, // 1 = text content
                payload: JSON.stringify({ text: content }),
                scope,
                status,
                ts: new Date(),
            }

            // 1. Write to local DB
            await db.insert(OR).values(newMemory)

            // 2. Queue for Sync
            await syncService.enqueueMutation('OR', 'INSERT', newMemory)

            router.back()
        } catch (e) {
            console.error('Failed to save memory:', e)
            alert('Failed to save memory')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Memory Content</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={content}
                        onChangeText={setContent}
                        placeholder="What's on your mind?"
                        multiline
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.formGroup, styles.half]}>
                        <Text style={styles.label}>Scope</Text>
                        <View style={styles.pillContainer}>
                            <TouchableOpacity
                                style={[styles.pill, scope === 'private' && styles.pillActive]}
                                onPress={() => setScope('private')}
                            >
                                <Text style={[styles.pillText, scope === 'private' && styles.pillTextActive]}>Private</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pill, scope === 'shared' && styles.pillActive]}
                                onPress={() => setScope('shared')}
                            >
                                <Text style={[styles.pillText, scope === 'shared' && styles.pillTextActive]}>Shared</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.formGroup, styles.half]}>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.pillContainer}>
                            <TouchableOpacity
                                style={[styles.pill, status === 'active' && styles.pillActive]}
                                onPress={() => setStatus('active')}
                            >
                                <Text style={[styles.pillText, status === 'active' && styles.pillTextActive]}>Active</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.pill, status === 'archived' && styles.pillActive]}
                                onPress={() => setStatus('archived')}
                            >
                                <Text style={[styles.pillText, status === 'archived' && styles.pillTextActive]}>Archived</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

            </ScrollView>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                style={styles.footer}
            >
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.disabledButton]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Memory'}</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 24,
    },
    formGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: '#F9FAFB',
        color: '#111827',
    },
    textArea: {
        height: 150,
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    half: {
        flex: 1,
    },
    pillContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
    },
    pill: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    pillActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    pillText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    pillTextActive: {
        color: '#111827',
        fontWeight: '600',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        backgroundColor: '#fff',
    },
    saveButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: '#93C5FD',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
})
