import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { useBluesky } from '../context/BlueskyContext'
import { AppBskyFeedDefs } from '@atproto/api'

const formatShortTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hrs ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
}

export default function TimelineView() {
    const { agent, isAuthenticated } = useBluesky()
    const [posts, setPosts] = useState<AppBskyFeedDefs.FeedViewPost[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTimeline = async () => {
        if (!isAuthenticated) return
        setError(null)
        try {
            const { data } = await agent.getTimeline({ limit: 50 })
            setPosts(data.feed)
        } catch (e: any) {
            console.error('Failed to fetch timeline:', e)
            setError('Failed to load timeline')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchTimeline()
    }, [isAuthenticated])

    const onRefresh = () => {
        setRefreshing(true)
        fetchTimeline()
    }

    const renderItem = ({ item }: { item: AppBskyFeedDefs.FeedViewPost }) => {
        const post = item.post
        const author = post.author
        const record = post.record as any

        return (
            <View style={styles.postContainer}>
                {/* Repost Indicator */}
                {item.reason?.$type === 'app.bsky.feed.defs#reasonRepost' && (
                    <View style={styles.repostHeader}>
                        <Ionicons name="repeat" size={12} color="#6B7280" />
                        <Text style={styles.repostText}>
                            Reposted by {item.reason.by.displayName || item.reason.by.handle}
                        </Text>
                    </View>
                )}

                {/* Header Row: Avatar, User Info, Time */}
                <View style={styles.headerRow}>
                    <Image source={{ uri: author.avatar }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                        <Text style={styles.displayName} numberOfLines={1}>
                            {author.displayName || author.handle}
                        </Text>
                        <Text style={styles.handle} numberOfLines={1}>
                            @{author.handle}
                        </Text>
                    </View>
                    <Text style={styles.time}>
                        {formatShortTime(record.createdAt)}
                    </Text>
                </View>

                {/* Content: Text & Images start from left (full width) */}
                <View style={styles.contentBody}>
                    {record.text ? (
                        <Text style={styles.postText}>{record.text}</Text>
                    ) : null}

                    {/* Image Embeds */}
                    {post.embed &&
                        post.embed.$type === 'app.bsky.embed.images#view' && (
                            <View style={styles.imagesContainer}>
                                {(post.embed as any).images?.map((img: any, index: number) => (
                                    <Image
                                        key={index}
                                        source={{ uri: img.thumb }}
                                        style={styles.postImage}
                                        resizeMode="cover"
                                    />
                                ))}
                            </View>
                        )}

                    <View style={styles.actions}>
                        <View style={styles.actionButton}>
                            <Ionicons name="chatbubble-outline" size={18} color="#536471" />
                            <Text style={styles.actionCount}>{post.replyCount || 0}</Text>
                        </View>
                        <View style={styles.actionButton}>
                            <Ionicons name="repeat-outline" size={18} color="#536471" />
                            <Text style={styles.actionCount}>{post.repostCount || 0}</Text>
                        </View>
                        <View style={styles.actionButton}>
                            <Ionicons name="heart-outline" size={18} color="#536471" />
                            <Text style={styles.actionCount}>{post.likeCount || 0}</Text>
                        </View>
                    </View>
                </View>
            </View>
        )
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={posts}
                keyExtractor={(item, index) => `${item.post.uri}-${index}`}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.centerContainer}>
                        {error ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : (
                            <Text style={styles.emptyText}>No posts yet</Text>
                        )}
                    </View>
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    postContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 12, // Minimal consistent padding
        backgroundColor: '#fff',
    },
    repostHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    repostText: {
        fontSize: 12,
        color: '#536471',
        marginLeft: 4,
        fontWeight: '500',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    displayName: {
        fontWeight: '700',
        color: '#0F1419',
        fontSize: 15,
        marginBottom: 2,
    },
    handle: {
        color: '#536471',
        fontSize: 13,
    },
    time: {
        color: '#536471',
        fontSize: 12,
    },
    contentBody: {
        // No margin left, start from start
    },
    postText: {
        fontSize: 15,
        color: '#0F1419',
        lineHeight: 22,
        marginBottom: 8,
    },
    imagesContainer: {
        marginTop: 0,
        marginBottom: 8,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    postImage: {
        width: '100%',
        height: 250,
        backgroundColor: '#F3F4F6',
    },
    actions: {
        flexDirection: 'row',
        marginTop: 4,
        justifyContent: 'space-between',
        maxWidth: 240,
        paddingRight: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 40,
    },
    actionCount: {
        fontSize: 13,
        color: '#536471',
        marginLeft: 6,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 15,
    },
    emptyText: {
        color: '#536471',
        fontSize: 15,
    },
})
