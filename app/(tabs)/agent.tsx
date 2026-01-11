import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(7);

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function AgentScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInputMode, setIsInputMode] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const insets = useSafeAreaInsets();

    // Listen for Tab Bar Trigger
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('TRIGGER_SEARCH_ACTION', () => {
            setIsInputMode(true);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        });
        return () => sub.remove();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) {
            setIsInputMode(false);
            return;
        }

        const userMsg: Message = { id: generateId(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsInputMode(false); // Close overlay immediately
        setLoading(true);

        try {
            // Cloudflare Worker Production URL
            const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tar-agent.tar-54d.workers.dev/api/chat';
            console.log('[AgentScreen] Sending request to:', API_URL);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
                })
            });

            console.log('[AgentScreen] Response Status:', response.status);

            if (!response.ok) {
                const errText = await response.text();
                console.error('[AgentScreen] Error response:', errText);
                throw new Error('Network response was not ok: ' + response.status);
            }

            const text = await response.text();
            console.log('[AgentScreen] Received response text length:', text.length);

            const assistantMsg: Message = { id: generateId(), role: 'assistant', content: text };
            setMessages(prev => [...prev, assistantMsg]);

        } catch (e) {
            console.error('[AgentScreen] Fetch Error:', e);
            // @ts-ignore
            const errorMsg: Message = { id: generateId(), role: 'assistant', content: `Connection error: ${e.message || 'Unknown error'}` };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
                {!isUser && (
                    <View style={styles.avatar}>
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    </View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
                    <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAssistant]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Agent</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => setMessages([])} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="chatbubble-ellipses-outline" size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>Tap center button to ask something...</Text>
                    </View>
                }
            />

            {/* Loading Indicator when bot is thinking (and overlay is closed) */}
            {loading && (
                <View style={[styles.loadingBar, { bottom: insets.bottom + 20 }]}>
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text style={styles.loadingText}>Agent is thinking...</Text>
                </View>
            )}

            {/* Full Screen Input Overlay */}
            {isInputMode && (
                <View style={[styles.inputOverlay, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.inputHeader}>
                        <TouchableOpacity onPress={() => setIsInputMode(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={loading || !input.trim()}
                            style={[styles.sendButtonOverlay, (!input.trim()) && styles.sendButtonDisabled]}
                        >
                            <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        ref={inputRef}
                        style={styles.largeInput}
                        placeholder="What can I do for you?"
                        placeholderTextColor="#CBD5E1"
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // Pure White
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        backgroundColor: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconBtn: {
        padding: 8,
        marginLeft: 8,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    msgRow: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'flex-start',
    },
    msgRowUser: {
        justifyContent: 'flex-end',
    },
    msgRowAssistant: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 4,
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
    },
    bubbleUser: {
        backgroundColor: '#3B82F6',
        borderBottomRightRadius: 4,
    },
    bubbleAssistant: {
        backgroundColor: '#F8FAFC',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    msgText: {
        fontSize: 16,
        lineHeight: 24,
    },
    msgTextUser: {
        color: '#FFFFFF',
    },
    msgTextAssistant: {
        color: '#1E293B',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
    loadingBar: {
        position: 'absolute',
        left: 24,
        right: 24,
        height: 48,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    loadingText: {
        marginLeft: 10,
        color: '#64748B',
        fontWeight: '500',
    },

    // Full Screen Overlay
    inputOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 1000,
        paddingHorizontal: 24,
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    closeButton: {
        padding: 8,
        marginLeft: -8,
    },
    largeInput: {
        fontSize: 32,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 42,
        flex: 1,
        textAlignVertical: 'top',
    },
    sendButtonOverlay: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
    }
});
