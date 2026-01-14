import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GenUiCard } from '../../src/components/GenUiCard';



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

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        setLoading(true);
        setResult(null);
        Keyboard.dismiss();

        try {
            const { aiService } = await import('../../src/services/AiService');
            // Optimistic Result for demo/speed or just wait? Let's wait.
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
                keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
            >
                <View style={styles.content}>
                    {/* Results / Empty State Area */}
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

                        {!loading && !result && input.trim().length === 0 && (
                            <View style={styles.centerContainer}>
                                {/* Empty State - No Text */}
                            </View>
                        )}

                        {!loading && result && (
                            <View style={styles.resultBox}>
                                {result.type === 'ACTION' && result.payload && (
                                    <GenUiCard
                                        opcode={result.opcode || 0}
                                        label={result.label || 'Action'}
                                        payload={result.payload}
                                        onSaved={() => {
                                            // Optional feedback
                                        }}
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
                    <View style={[styles.inputSection, { paddingBottom: insets.bottom + 100 }]}>
                        <View style={styles.inputHeader}>
                            {/* Optional: App Title or just space */}
                            <View style={{ width: 48 }} />

                            {/* Clear Button (only if content exists) */}
                            {(input.length > 0 || result) && (
                                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                                    <Text style={styles.clearText}>Clear</Text>
                                </TouchableOpacity>
                            )}
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
                            returnKeyType="default"
                        // onSubmitEditing={handleSend} // multiline doesn't support onSubmitEditing easily without blur, usually enter adds newline. We'll rely on button.
                        />

                        {/* Send Button (Visible when typing) */}
                        {input.trim().length > 0 && !loading && !result && (
                            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
                                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        )}
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
        paddingHorizontal: 24,
    },
    inputSection: {
        paddingTop: 10,
        backgroundColor: '#FFFFFF', // Ensure background is opaque for keyboard transition
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        height: 24,
    },
    clearBtn: {
        padding: 4,
    },
    clearText: {
        color: '#94A3B8',
        fontWeight: '600',
    },
    largeInput: {
        fontSize: 24,
        fontWeight: '600',
        color: '#0F172A',
        lineHeight: 32,
        textAlignVertical: 'top',
        minHeight: 100, // Roughly 3 lines at 32px lineHeight
        maxHeight: 200,
    },
    sendButton: {
        position: 'absolute',
        right: 0,
        bottom: 0,
        backgroundColor: '#0F172A',
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    resultsContainer: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        opacity: 0.8,
    },
    placeholderText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
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
    }
});
