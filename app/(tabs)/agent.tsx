import React, { useState, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, StyleSheet, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StatusBar, DeviceEventEmitter } from 'react-native';
import { tursoService } from '../../src/services/TursoService';
import { Ionicons } from '@expo/vector-icons';

export default function AgentScreen() {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [isInputMode, setIsInputMode] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Initial load & Event Listener
    React.useEffect(() => {
        loadRecent();

        const sub = DeviceEventEmitter.addListener('TRIGGER_SEARCH_ACTION', () => {
            setIsInputMode(true);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        });

        return () => sub.remove();
    }, []);

    const loadRecent = async () => {
        setLoading(true);
        try {
            const hits = await tursoService.list(50);
            setResults(hits);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchText.trim()) {
            setIsInputMode(false);
            return;
        }
        setLoading(true);
        try {
            const hits = await tursoService.search(searchText);
            setResults(hits);
            setIsInputMode(false);
            setSearchText('');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to search memories');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTestMemory = async () => {
        if (!searchText.trim()) {
            Alert.alert('Empty', 'Type something to add.');
            return;
        }
        setAdding(true);
        try {
            await tursoService.addMemory({
                title: 'Note',
                content: searchText,
                type: 1
            });
            setSearchText('');
            loadRecent();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to add memory');
        } finally {
            setAdding(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <Text style={styles.itemDate}>
                    {item.created_at ? new Date(item.created_at * 1000).toLocaleDateString() : 'Just now'}
                </Text>
                {item.distance !== undefined && (
                    <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>{((1 - item.distance) * 100).toFixed(0)}% Match</Text>
                    </View>
                )}
            </View>
            <Text style={styles.itemContent}>{item.content}</Text>
        </View>
    );

    const insets = useSafeAreaInsets();
    // TabBar height approx 64 + 20 (padding) + insets.bottom
    const tabBarHeight = 64 + 20 + insets.bottom;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Agent</Text>
                    <Text style={styles.headerSubtitle}>{results.length} memories active</Text>
                </View>
                <TouchableOpacity onPress={loadRecent} style={styles.refreshBtn}>
                    <Ionicons name="refresh-outline" size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <FlatList
                data={results}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="sparkles-outline" size={48} color="#E2E8F0" />
                        <Text style={styles.emptyText}>Ask me anything or save a memory...</Text>
                    </View>
                }
            />

            {/* Full Screen Notion-Like Input Overlay */}
            {isInputMode && (
                <View style={[styles.inputOverlay, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.inputHeader}>
                        <TouchableOpacity onPress={() => setIsInputMode(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="#94A3B8" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSearch}
                            disabled={loading || searchText.trim().length === 0}
                            style={[
                                styles.sendButton,
                                (loading || searchText.trim().length === 0) && styles.sendButtonDisabled
                            ]}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        ref={inputRef}
                        style={styles.largeInput}
                        placeholder="What's on your mind?"
                        placeholderTextColor="#CBD5E1"
                        value={searchText}
                        onChangeText={setSearchText}
                        multiline
                        maxLength={1000}
                        textAlignVertical="top"
                    />
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A', // Slate 900
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748B', // Slate 500
        fontWeight: '500',
        marginTop: 2,
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    itemContainer: {
        paddingVertical: 12,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    itemDate: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    matchBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    matchText: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    itemContent: {
        fontSize: 15,
        color: '#1E293B', // Slate 800
        lineHeight: 22,
    },
    separator: {
        height: 1,
        backgroundColor: '#E2E8F0', // Slate 200
        marginVertical: 4,
    },

    // Notion-Like Input Overlay Styles
    inputOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        zIndex: 1000, // Cover everything
        paddingHorizontal: 24,
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    closeButton: {
        padding: 8,
        marginLeft: -8,
    },
    largeInput: {
        fontSize: 32,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 40,
        flex: 1, // Take remaining space
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#E2E8F0',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    },
});
