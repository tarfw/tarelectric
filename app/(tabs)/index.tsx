import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, LayoutAnimation, UIManager } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GenUiCard } from '../../src/components/GenUiCard';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

type AiResult = {
    type: 'ACTION' | 'CHAT' | 'ERROR';
    opcode?: number;
    label?: string;
    payload?: any;
    reply?: string;
};

export default function AgentScreen() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AiResult | null>(null);
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);

    // Constant padding: Always clear TabBar to avoid jumps
    // The user explicitly requested "same at all states"
    // Standard padding: Just aesthetic frame padding.
    // The TabBar is now relative, so it sits below this view.
    const bottomPadding = 12; // Minimal internal padding

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        setLoading(true);
        setResult(null);
        Keyboard.dismiss();

        try {
            const { aiService } = await import('../../src/services/AiService');
            const response = await aiService.processInput(input);

            if (response.type === 'ACTION') {
                setResult({
                    type: 'ACTION',
                    opcode: response.opcode,
                    label: response.label,
                    payload: response.payload
                });
            } else {
                setResult({
                    type: 'CHAT',
                    reply: response.reply
                });
            }

        } catch (e) {
            console.error('[AgentScreen] Error:', e);
            setResult({ type: 'ERROR', reply: "Sorry, I had trouble processing that." });
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setInput('');
        setResult(null);
        inputRef.current?.focus();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.content}>

                    {/* Results Area */}
                    <ScrollView
                        style={styles.resultsContainer}
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                    >
                        {loading && (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color="#3B82F6" />
                                <Text style={styles.loadingText}>Thinking...</Text>
                            </View>
                        )}

                        {!loading && result && (
                            <View style={styles.resultBox}>
                                {result.type === 'ACTION' && result.payload && (
                                    <GenUiCard
                                        opcode={result.opcode || 0}
                                        label={result.label || 'Action'}
                                        payload={result.payload}
                                        onSaved={() => { }}
                                    />
                                )}

                                {(result.type === 'CHAT' || result.type === 'ERROR') && (
                                    <View style={styles.chatCard}>
                                        <Text style={styles.chatText}>{result.reply}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Input Area */}
                    <View style={[styles.inputSection, { paddingBottom: bottomPadding }]}>
                        {(input.length > 0 || result) && (
                            <View style={styles.actionsRow}>
                                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                                    <Text style={styles.clearText}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.inputWrapper}>
                            <TextInput
                                ref={inputRef}
                                style={styles.largeInput}
                                placeholder="Message Agent..."
                                placeholderTextColor="#94A3B8"
                                value={input}
                                onChangeText={setInput}
                                multiline
                                maxLength={500}
                                returnKeyType="default"
                            />

                            {/* Send Button */}
                            {input.trim().length > 0 && !loading && !result && (
                                <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                                    <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        // Padding is now handled dynamically in style
    },
    resultsContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        opacity: 0.8,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748B',
        fontWeight: '500',
    },
    resultBox: {
        paddingTop: 10,
    },
    chatCard: {
        backgroundColor: '#F8FAFC',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    chatText: {
        fontSize: 18,
        color: '#1E293B',
        lineHeight: 28,
    },

    // --- Input Styles ---
    inputSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 24, // Wider padding for clean look
        paddingTop: 16,
        // paddingBottom: Handled inline
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9', // Subtle separator
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    clearBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
    },
    clearText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        // Minimalist: No background, no border, no shadow
        paddingVertical: 0,
    },
    largeInput: {
        flex: 1,
        fontSize: 24, // Large, title-like font
        fontWeight: '600',
        color: '#0F172A',
        lineHeight: 34,
        minHeight: 40,
        maxHeight: 200,
        textAlignVertical: 'center',
        paddingRight: 60, // Space for button
        paddingVertical: 0,
        paddingLeft: 0, // Align Left
    },
    sendButton: {
        position: 'absolute', // Absolute positioning to float over text if needed, or just right align
        right: 0,
        bottom: 4,
        backgroundColor: '#0F172A',
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
