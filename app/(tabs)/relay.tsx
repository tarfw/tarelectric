import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useBluesky } from '../../src/context/BlueskyContext'
import { formatDistanceToNow } from 'date-fns'
import TimelineView from '../../src/components/TimelineView'

// --- Types ---
type ViewMode = 'chats' | 'timeline'

export default function RelayScreen() {
    const router = useRouter()
    const { agent, isAuthenticated, loading: authLoading, userProfile } = useBluesky()
    const [viewMode, setViewMode] = useState<ViewMode>('chats')

    // --- Data State for Chats ---
    // We keep the chat fetching logic here or move it slightly. 
    // To keep it clean, let's keep it here but only trigger/render when active.
    const [conversations, setConversations] = useState<any[]>([])
    const [chatsLoading, setChatsLoading] = useState(false)
    const [chatsRefreshing, setChatsRefreshing] = useState(false)
    const [chatError, setChatError] = useState<string | null>(null)

    // --- Chat Fetching Logic ---
    const fetchConversations = async () => {
        if (!isAuthenticated) return
        setChatsLoading(true)
        setChatError(null)
        try {
            const headers: Record<string, string> = {
                'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat'
            }
            const { data } = await agent.chat.bsky.convo.listConvos({ limit: 20 }, { headers })
            setConversations(data.convos)
        } catch (e: any) {
            console.error('Failed to fetch chats:', e)
            setChatError(e.message || 'Failed to load chats')
        } finally {
            setChatsLoading(false)
            setChatsRefreshing(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated && viewMode === 'chats') {
            fetchConversations()
        }
    }, [isAuthenticated, viewMode])

    const onRefreshChats = () => {
        setChatsRefreshing(true)
        fetchConversations()
    }

    // --- Renderers ---

    const renderChatItem = ({ item }: { item: any }) => {
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
                <View style={styles.chatAvatar}>
                    {otherMember?.avatar ? (
                        <Image source={{ uri: otherMember.avatar }} style={styles.chatAvatarImage} />
                    ) : (
                        <Ionicons name="person" size={24} color="#9CA3AF" />
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.chatName} numberOfLines={1}>{displayName}</Text>
                        <Text style={styles.chatTime}>
                            {item.lastMessage?.sentAt ? formatDistanceToNow(new Date(item.lastMessage.sentAt), { addSuffix: true }) : ''}
                        </Text>
                    </View>
                    <Text style={styles.chatMessage} numberOfLines={1}>
                        {item.lastMessage?.text || 'No messages yet'}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    }

    const renderChatList = () => {
        if (!isAuthenticated) {
            return (
                <View style={styles.centerContainer}>
                    <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyText}>Connect Bluesky to see your chats</Text>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/settings')}>
                        <Text style={styles.actionButtonText}>Go to Settings</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <View style={styles.contentContainer}>
                <View style={styles.contentHeader}>
                    <Text style={styles.contentTitle}>Messages</Text>
                    <TouchableOpacity onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id}
                    renderItem={renderChatItem}
                    contentContainerStyle={styles.list}
                    refreshing={chatsRefreshing}
                    onRefresh={onRefreshChats}
                    ListEmptyComponent={
                        !chatsLoading ? (
                            <View style={styles.centerContainer}>
                                {chatError ? (
                                    <>
                                        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                                        <Text style={[styles.emptyText, { color: '#EF4444' }]}>{chatError}</Text>
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
            </View>
        )
    }

    if (authLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

            {/* Sidebar */}
            <View style={styles.sidebar}>
                {/* 1. Profile Circle - Shows Chat List */}
                <TouchableOpacity
                    style={[styles.sidebarButton, viewMode === 'chats' && styles.sidebarButtonActive]}
                    onPress={() => setViewMode('chats')}
                >
                    <View style={[styles.sidebarIconContainer, viewMode === 'chats' && styles.sidebarIconActive]}>
                        {userProfile?.avatar ? (
                            <Image source={{ uri: userProfile.avatar }} style={styles.sidebarAvatar} />
                        ) : (
                            <Ionicons name="person" size={24} color={viewMode === 'chats' ? "#2563EB" : "#4B5563"} />
                        )}
                    </View>
                </TouchableOpacity>

                {/* 2. Bluesky Circle - Shows General Timeline */}
                <TouchableOpacity
                    style={[styles.sidebarButton, viewMode === 'timeline' && styles.sidebarButtonActive]}
                    onPress={() => setViewMode('timeline')}
                >
                    <View style={[styles.sidebarIconContainer, viewMode === 'timeline' && styles.sidebarIconActive]}>
                        <Ionicons name="planet" size={28} color={viewMode === 'timeline' ? "#2563EB" : "#4B5563"} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <View style={styles.mainContent}>
                {viewMode === 'chats' ? renderChatList() : <TimelineView />}
            </View>

        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        flexDirection: 'row', // Horizontal layout
    },
    sidebar: {
        width: 60,
        backgroundColor: '#F9FAFB',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 20,
    },
    sidebarButton: {
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sidebarIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },
    sidebarButtonActive: {
        // Optional active state wrapper styles
    },
    sidebarIconActive: {
        borderWidth: 2,
        borderColor: '#2563EB',
        backgroundColor: '#fff',
    },
    sidebarAvatar: {
        width: '100%',
        height: '100%',
    },
    mainContent: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Content Header
    contentHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contentTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    contentContainer: {
        flex: 1,
    },
    // Chat List Styles
    list: {
        flexGrow: 1,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    chatAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    chatAvatarImage: {
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
    chatName: {
        fontWeight: '600',
        fontSize: 16,
        color: '#111827',
        maxWidth: '70%',
    },
    chatTime: {
        color: '#9CA3AF',
        fontSize: 12,
    },
    chatMessage: {
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
