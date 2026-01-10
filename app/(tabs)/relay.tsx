import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, StyleSheet, View, FlatList, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

const DUMMY_CHATS = [
    { id: '1', name: 'Alice', message: 'Hey, did you see the update?', time: '10:30 AM' },
    { id: '2', name: 'Bob', message: 'Meeting at 2 PM', time: 'Yesterday' },
    { id: '3', name: 'Charlie', message: 'Can we sync later?', time: 'Yesterday' },
]

export default function RelayScreen() {
    const router = useRouter()

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Relay</Text>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={24} color="#111827" />
                </TouchableOpacity>
            </View>
            <FlatList
                data={DUMMY_CHATS}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.chatItem}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={20} color="#6B7280" />
                        </View>
                        <View style={styles.chatInfo}>
                            <View style={styles.chatHeader}>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.time}>{item.time}</Text>
                            </View>
                            <Text style={styles.message} numberOfLines={1}>{item.message}</Text>
                        </View>
                    </View>
                )}
                contentContainerStyle={styles.list}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    list: {
        padding: 16,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: '#111827',
    },
    time: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    message: {
        color: '#6B7280',
        fontSize: 14,
    },
})
