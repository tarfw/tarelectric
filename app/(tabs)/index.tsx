import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, DeviceEventEmitter, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(7);

// Happy Bouncing Icon Component
const HappyIcon = () => {
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const float = Animated.sequence([
            Animated.timing(translateY, {
                toValue: -15,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.ease),
            })
        ]);

        const loop = Animated.loop(float);
        loop.start();

        return () => loop.stop();
    }, []);

    return (
        <Animated.View style={{ transform: [{ translateY }] }}>
            <Ionicons name="happy-outline" size={72} color="#0F172A" />
        </Animated.View>
    );
};

import { GenUiCard } from '../../src/components/GenUiCard';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actionPayload?: {
        opcode: number;
        label: string;
        payload: any;
    };
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
        const currentInput = input;
        setInput('');
        setIsInputMode(false); // Close overlay immediately
        setLoading(true);

        try {
            const { aiService } = await import('../../src/services/AiService');
            const result = await aiService.processInput(currentInput);

            if (result.type === 'ACTION') {
                setLoading(false);
                const actionMsg: Message = {
                    id: generateId(),
                    role: 'assistant',
                    content: '',
                    actionPayload: {
                        opcode: result.opcode,
                        label: result.label,
                        payload: result.payload
                    }
                };
                setMessages(prev => [...prev, actionMsg]);
                return;
            }

            // If CHAT, show reply
            const assistantMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: result.reply || "I didn't understand that."
            };
            setMessages(prev => [...prev, assistantMsg]);

        } catch (e) {
            console.error('[AgentScreen] Error:', e);
            const errorMsg: Message = { id: generateId(), role: 'assistant', content: "Sorry, I had trouble processing that." };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';

        // GenUI Card Render
        if (item.actionPayload) {
            return (
                <View style={{ marginBottom: 16, paddingHorizontal: 8 }}>
                    <GenUiCard
                        opcode={item.actionPayload.opcode}
                        label={item.actionPayload.label}
                        payload={item.actionPayload.payload}
                        onSaved={() => {
                            // Optional: Feedback or remove card? 
                            // For now, the card itself handles state to show "Saved"
                        }}
                    />
                </View>
            );
        }

        return (
            <View style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : styles.msgRowAssistant
            ]}>
                {!isUser && (
                    // Avatar Removed as requested
                    <View style={{ width: 0 }} />
                )}
                <View style={[
                    styles.bubble,
                    isUser ? styles.bubbleUser : styles.bubbleAssistant
                ]}>
                    <Text style={[
                        styles.msgText,
                        isUser ? styles.msgTextUser : styles.msgTextAssistant
                    ]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ai</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => setMessages([])} style={styles.iconBtn}>
                        <Text style={{ color: '#64748B', fontSize: 16 }}>Clear</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80, flexGrow: 1 }]}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <HappyIcon />
                        <Text style={styles.emptyText}>Hi !</Text>
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
    inputContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    inputWrapper: { // THIS IS THE BOTTOM BAR INPUT
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6', // Light Grey
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827', // Black text
        maxHeight: 100,
    },
    sendBtn: {
        marginLeft: 8,
        padding: 8,
        backgroundColor: '#0F172A', // Black button
        borderRadius: 99,
    },
    msgRow: {
        flexDirection: 'row',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    msgRowUser: {
        justifyContent: 'flex-end',
    },
    msgRowAssistant: {
        justifyContent: 'flex-start',
    },
    // Avatar Removed
    avatar: {
        display: 'none',
    },
    bubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
    },
    bubbleUser: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        color: '#111827', // Black
    },
    msgTextAssistant: {
        color: '#1F2937',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        // paddingTop removed to allow true vertical centering
    },
    emptyText: {
        marginTop: 24,
        fontSize: 32, // Large greeting
        color: '#0F172A',
        fontWeight: '300', // Minimalist thin font
        letterSpacing: 1,
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
