import React, { useState, useEffect } from 'react'
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
import { router, useLocalSearchParams, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Crypto from 'expo-crypto'
import { db } from '../src/db/client'
import { OR } from '../src/db/schema'
import { syncService } from '../src/services/SyncService'
import { embeddingService } from '../src/services/EmbeddingService'
import { vectorStore } from '../src/services/VectorStore'

export default function AddMemoryScreen() {
    const { opcode, label, draft } = useLocalSearchParams()

    // Parse Draft
    let initialContent = '';
    try {
        if (draft) {
            const parsed = JSON.parse(String(draft));
            initialContent = parsed.text || '';
            // If we had more fields (qty, product), we would set them here 
            // but currently the form only has 'content'.
            // So we just use the raw text or formatted text.
            if (parsed.qty) initialContent += `\nQty: ${parsed.qty}`;
        }
    } catch (e) { }

    // Redirect Opcode 501 (Product) to the specialized Product UCP Editor
    useEffect(() => {
        if (Number(opcode) === 501) {
            router.replace('/product/editor')
        }
    }, [opcode])

    const [content, setContent] = useState(initialContent)
    const [scope, setScope] = useState('private')
    const [status, setStatus] = useState('active')
    const [loading, setLoading] = useState(false)

    // Parse opcode to number, default to 1 (Text) if missing
    const opcodeNum = opcode ? Number(opcode) : 1
    const opcodeLabel = label ? String(label) : 'Text Note'

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
                opcode: opcodeNum,
                payload: JSON.stringify({ text: content }),
                scope,
                status,
                ts: new Date(),
            }

            // 1. Write to local DB
            await db.insert(OR).values(newMemory)

            // 2. Generate and Store Embedding (Async)
            // We do this concurrently or await it. Awaiting ensures it's ready for search immediately.
            try {
                const vector = await embeddingService.embed(content);
                await vectorStore.addDocument(newMemory.id, vector, content);
            } catch (err) {
                console.error('Failed to generate local embedding:', err);
                // Don't block save on embedding failure
            }

            // 3. Queue for Sync
            await syncService.enqueueMutation('OR', 'INSERT', newMemory)

            router.dismissAll() // Go back to root/tabs
        } catch (e) {
            console.error('Failed to save memory:', e)
            alert('Failed to save memory')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* Header / Top Bar */}
            <SafeAreaView edges={['top']} style={styles.headerSafe}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{opcodeLabel} ({opcodeNum})</Text>
                    <View style={{ width: 50 }} />
                </View>
            </SafeAreaView>

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
                        autoFocus
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
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flexShrink: 0 }}
            >
                <SafeAreaView edges={['bottom']} style={styles.footerSafe}>
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, loading && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Memory'}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerSafe: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    header: {
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    headerTitle: {
        color: '#111827',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#111827',
        fontSize: 16,
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
        textAlignVertical: 'top',
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
    footerSafe: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    footer: {
        padding: 16,
        paddingTop: 12,
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
