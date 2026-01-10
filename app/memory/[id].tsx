import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../src/db/client';
import { OR } from '../../src/db/schema';
import { vectorStore } from '../../src/services/VectorStore';
import { eq } from 'drizzle-orm';
import { supabase } from '../../src/utils/supabase';

export default function MemoryDetailScreen() {
    const { id } = useLocalSearchParams();
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadItem();
    }, [id]);

    const loadItem = async () => {
        try {
            if (!id || typeof id !== 'string') return;
            const results = await db.select().from(OR).where(eq(OR.id, id));
            if (results.length > 0) {
                setItem(results[0]);
            }
        } catch (e) {
            console.error('Error loading memory:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete Memory",
            "Are you sure you want to delete this memory? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (!id || typeof id !== 'string') return;

                            // 1. Delete from Cloud (Supabase)
                            // This ensures the delete propagates to other devices via Electric
                            const { error } = await supabase.from('OR').delete().eq('id', id);
                            if (error) {
                                console.error('Supabase delete error:', error);
                                // Optional: Alert user, but we might want to proceed with local delete anyway
                                // or add to offline queue. For now, we log and proceed optimistically.
                            }

                            // 2. Delete from Vector Store (Local Index)
                            await vectorStore.deleteDocument(id);

                            // 3. Delete from Local DB (Optimistic Update)
                            await db.delete(OR).where(eq(OR.id, id));

                            // 4. Go back
                            router.back();
                        } catch (e) {
                            console.error('Delete failed:', e);
                            Alert.alert("Error", "Failed to delete memory.");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    if (!item) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Memory not found.</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backLink}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    let content = '';
    let parsed: any = {};
    try {
        parsed = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        content = parsed.text || JSON.stringify(parsed, null, 2);
    } catch (e) {
        content = String(item.payload);
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <Stack.Screen options={{
                headerShown: true,
                title: 'Memory Details',
                headerBackTitle: 'Back'
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.date}>{new Date(item.ts).toLocaleString()}</Text>

                {parsed.name && <Text style={styles.nameLabel}>{parsed.name}</Text>}
                {parsed.category && <Text style={styles.categoryLabel}>{parsed.category}</Text>}

                <View style={styles.card}>
                    <Text style={styles.body}>{content}</Text>
                </View>

                <View style={styles.metaContainer}>
                    <Text style={styles.metaText}>ID: {item.id}</Text>
                    <Text style={styles.metaText}>Status: {item.status}</Text>
                </View>

                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <Text style={styles.deleteText}>Delete Memory</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
    },
    date: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    nameLabel: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    categoryLabel: {
        fontSize: 16,
        color: '#2563EB',
        fontWeight: '600',
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    body: {
        fontSize: 18,
        color: '#374151',
        lineHeight: 28,
    },
    metaContainer: {
        marginBottom: 32,
    },
    metaText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontFamily: 'monospace',
    },
    deleteButton: {
        alignSelf: 'flex-start',
    },
    deleteText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 18,
        color: '#374151',
        textAlign: 'center',
        marginTop: 40,
    },
    backLink: {
        color: '#2563EB',
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
    }
});
