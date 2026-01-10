import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { tursoService } from '../../src/services/TursoService';
import { Ionicons } from '@expo/vector-icons';

export default function AgentScreen() {
    const [searchText, setSearchText] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Initial load
    React.useEffect(() => {
        loadRecent();
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
            loadRecent();
            return;
        }
        setLoading(true);
        try {
            const hits = await tursoService.search(searchText);
            setResults(hits);
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

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Memories</Text>
                    <Text style={styles.headerSubtitle}>{results.length} items stored in Turso</Text>
                </View>
                <TouchableOpacity onPress={loadRecent} style={styles.refreshBtn}>
                    <Ionicons name="refresh-outline" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.input}
                        placeholder="Search or type to add..."
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={handleAddTestMemory} disabled={adding}>
                            {adding ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <Ionicons name="add-circle" size={28} color="#111827" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={results}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="documents-outline" size={48} color="#E5E7EB" />
                        <Text style={styles.emptyText}>No memories found</Text>
                    </View>
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
        marginTop: 4,
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111827',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    itemContainer: {
        paddingVertical: 16,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    itemDate: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    matchBadge: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    matchText: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '700',
    },
    itemContent: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#9CA3AF',
    }
});
