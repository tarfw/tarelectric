import React, { useEffect, useState, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useBluesky } from '../../src/context/BlueskyContext'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow } from 'date-fns'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const CHAT_PROXY_HEADER = {
    'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat'
}

export default function ChatScreen() {
    const { id, handle, displayName } = useLocalSearchParams()
    const { agent, isAuthenticated } = useBluesky()
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const [messages, setMessages] = useState<any[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const flatListRef = useRef<FlatList>(null)

    // We need to fetch the conversation details to get members/title
    // But listConvos doesn't give single convo by ID easily without filtering?
    // getConvoForMembers might be needed or just rely on messages which might not have full member info embedded.
    // For now, let's just show messages.

    const fetchMessages = async () => {
        try {
            const { data } = await agent.chat.bsky.convo.getMessages({ convoId: id as string, limit: 50 }, { headers: CHAT_PROXY_HEADER })
            setMessages(data.messages)
        } catch (e) {
            console.error('Failed to fetch messages:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated && id) {
            fetchMessages()
            // Poll for new messages every 5 seconds
            const interval = setInterval(fetchMessages, 5000)
            return () => clearInterval(interval)
        }
    }, [isAuthenticated, id])

    const handleSend = async () => {
        if (!text.trim()) return
        setSending(true)
        try {
            await agent.chat.bsky.convo.sendMessage(
                { convoId: id as string, message: { text: text.trim() } },
                { headers: CHAT_PROXY_HEADER }
            )
            setText('')
            fetchMessages() // Refresh immediately
        } catch (e) {
            console.error('Failed to send message:', e)
            alert('Failed to send message')
        } finally {
            setSending(false)
        }
    }

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.sender?.did === agent.session?.did
        return (
            <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
                {/* Avatar removed per user request for cleaner UI */}
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                        {item.text}
                    </Text>
                    {/* Time is often hidden in minimal chat UIs until tapped, or very small. Keeping it small for now. */}
                    <Text style={[styles.timeText, isMe ? styles.myTimeText : styles.otherTimeText]}>
                        {formatDistanceToNow(new Date(item.sentAt), { addSuffix: true })}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: (displayName as string) || (handle as string) || 'Chat',
                    headerBackTitle: 'Relay',
                    headerStyle: { backgroundColor: '#fff' },
                    headerShadowVisible: false,
                }}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={[styles.list, { paddingBottom: 20 }]}
                    inverted
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                style={styles.keyboardView}
            >
                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            value={text}
                            onChangeText={setText}
                            placeholder="Chat message"
                            multiline
                            placeholderTextColor="#5F6368"
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, (!text.trim() || sending) && styles.disabledSend]}
                            onPress={handleSend}
                            disabled={!text.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color="#2563EB" />
                            ) : (
                                <Ionicons name="send" size={20} color={text.trim() ? "#2563EB" : "#9CA3AF"} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 8, // Tighter spacing like Google Chat
        alignItems: 'flex-end',
    },
    myMessageRow: {
        justifyContent: 'flex-end',
    },
    otherMessageRow: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginBottom: 4,
        overflow: 'hidden',
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: '#efefef', // Google-like fallback
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        fontSize: 12,
        fontWeight: '500',
        color: '#5F6368',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    bubble: {
        maxWidth: '75%',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 18, // Google Chat rounded look
    },
    myBubble: {
        backgroundColor: '#D3E3FD',
        borderTopRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: '#F1F3F4',
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    myMessageText: {
        color: '#1F1F1F',
    },
    otherMessageText: {
        color: '#1F1F1F',
    },
    timeText: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTimeText: {
        color: '#444746',
    },
    otherTimeText: {
        color: '#444746',
    },
    keyboardView: {
        backgroundColor: '#fff',
    },
    inputContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F3F4', // Pill shape input background
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 4,
        minHeight: 48,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 100,
        color: '#1F1F1F',
        paddingTop: 12,
        paddingBottom: 12,
    },
    sendButton: {
        marginLeft: 8,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledSend: {
        // opacity: 0.5 handled by icon color
    },
})
