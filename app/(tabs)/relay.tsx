import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useBluesky } from '../../src/context/BlueskyContext'
import { formatDistanceToNow } from 'date-fns'

export default function RelayScreen() {
    const router = useRouter()
    const { agent, isAuthenticated, loading: authLoading } = useBluesky()
    const [conversations, setConversations] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchConversations = async () => {
        if (!isAuthenticated) return
        setLoading(true)
        setError(null)
        try {
            // Bluesky DMs require the `atproto-proxy` header pointing to the `bsky_chat` service DID.
            // 1. Get user's DID doc to find the chat service.
            // 2. Or, for now, try the standard proxy header format assuming standard PDS.

            // Standard approach: The separate chat service is usually api.bsky.chat, but we should look it up.
            // Let's try sending the request with the specific proxy header: `did:web:api.bsky.chat#bsky_chat` is common but dynamic.

            // Safe robust way:
            const { data: profile } = await agent.getProfile({ actor: agent.session!.did })
            // We need the DID Doc, getProfile returns a view.
            // resolveHandle or such? 
            // agent.resolveHandle({ handle: ... }) -> did

            // Simplest fix for typical Bluesky users (hosted on bsky.social):
            // The chat service DID is often `did:web:api.bsky.chat#bsky_chat`.

            const headers: Record<string, string> = {
                'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat'
            }

            const { data } = await agent.chat.bsky.convo.listConvos({ limit: 20 }, { headers })
            setConversations(data.convos)
        } catch (e: any) {
            console.error('Failed to fetch chats:', e)
            setError(e.message || 'Failed to load chats')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchConversations()
        }
    }, [isAuthenticated])

    const onRefresh = () => {
        setRefreshing(true)
        fetchConversations()
    }

    const renderItem = ({ item }: { item: any }) => {
        // item.members is array of profiles. Find the one that isn't me? 
        // For simple list, let's just show the last message and basic info.
        // Usually index 0... but need to filter out 'me'. 
        // agent.session.did is 'me'.
        const otherMember = item.members.find((m: any) => m.did !== agent.session?.did) || item.members[0]
        const displayName = otherMember?.displayName || otherMember?.handle || 'Unknown'

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => router.push({
                    pathname: `/chat/${item.id}`,
                    params: {
                        handle: otherMember?.handle,
                        displayName: displayName
                    }
                })}
            >
                <View style={styles.avatar}>
                    {otherMember?.avatar ? (
                        <Image source={{ uri: otherMember.avatar }} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="person" size={24} color="#9CA3AF" />
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.name} numberOfLines={1}>{otherMember?.displayName || otherMember?.handle || 'Unknown'}</Text>
                        <Text style={styles.time}>
                            {item.lastMessage?.sentAt ? formatDistanceToNow(new Date(item.lastMessage.sentAt), { addSuffix: true }) : ''}
                        </Text>
                    </View>
                    <Text style={styles.message} numberOfLines={1}>
                        {item.lastMessage?.text || 'No messages yet'}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    }

    if (authLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={[styles.header, { justifyContent: 'center' }]}>
                    <ActivityIndicator />
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Relay</Text>
                <TouchableOpacity onPress={() => router.push('/settings')}>
                    <Ionicons name="settings-outline" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            {!isAuthenticated ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Connect Bluesky to see your chats</Text>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/settings')}>
                        <Text style={styles.actionButtonText}>Go to Settings</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.centerContainer}>
                                {error ? (
                                    <>
                                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                                        <Text style={[styles.emptyText, { color: '#EF4444' }]}>{error}</Text>
                                        <Text style={styles.subText}>Make sure your app password has 'Chat' access.</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                                        <Text style={styles.emptyText}>No conversations yet</Text>
                                    </>
                                )}
                            </View>
                        ) : null
                    }
                />
            )}
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
        flexGrow: 1,
        padding: 16,
        paddingBottom: 120,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
        alignItems: 'center',
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: '#111827',
        maxWidth: '70%',
    },
    time: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    message: {
        color: '#6B7280',
        fontSize: 14,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        textAlign: 'center',
    },
    subText: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
    },
    actionButton: {
        marginTop: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: '#2563EB',
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
})
