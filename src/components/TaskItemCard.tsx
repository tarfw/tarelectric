import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface TaskItemCardProps {
    item: any;
}

export function TaskItemCard({ item }: TaskItemCardProps) {
    /* Opcode 501: Product - Custom Renderer */
    if (item.opcode === 501) {
        let parsed: any = {};
        try {
            parsed = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        } catch (e) { parsed = {} }

        const title = parsed.content?.title || parsed.identifier?.brand?.name || 'Untitled Product';
        const brand = parsed.identifier?.brand?.name || '';
        const price = parsed.pricing?.display_price || '';

        return (
            <TouchableOpacity
                style={styles.container}
                onPress={() => {
                    if (!item.id) return;
                    router.push({
                        pathname: '/product/editor',
                        params: {
                            id: item.id,
                            initialData: typeof item.payload === 'string' ? item.payload : JSON.stringify(item.payload)
                        }
                    });
                }}
            >
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ backgroundColor: '#F3E8FF', padding: 4, borderRadius: 4 }}>
                            <Ionicons name="cube-outline" size={14} color="#9333EA" />
                        </View>
                        <Text style={styles.streamId}>PRODUCT</Text>
                    </View>
                    <Text style={styles.footer}>{new Date(item.ts).toLocaleDateString()}</Text>
                </View>

                <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{title}</Text>
                    {brand ? <Text style={{ fontSize: 13, color: '#6B7280' }}>{brand}</Text> : null}

                    <View style={{ flexDirection: 'row', marginTop: 6, gap: 8 }}>
                        <View style={[styles.badge, { backgroundColor: '#F3F4F6' }]}>
                            <Text style={styles.badgeText}>{parsed.identifier?.sku || 'NO SKU'}</Text>
                        </View>
                        {price ? (
                            <View style={[styles.badge, { backgroundColor: '#ECFDF5' }]}>
                                <Text style={[styles.badgeText, { color: '#059669' }]}>{price}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    let content = 'Unknown Payload';
    try {
        const parsed = typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload;
        content = JSON.stringify(parsed, null, 2);
    } catch (e) {
        content = String(item.payload);
    }

    return (
        <View style={styles.container}>
            {/* Header Row: ID + Badges */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.streamId}>{item.streamId || 'Local'}</Text>
                </View>

                <View style={styles.badgesRow}>
                    {/* Delta Badge */}
                    {item.delta !== null && item.delta !== undefined && item.delta !== 0 && (
                        <View style={[styles.badge, { backgroundColor: item.delta > 0 ? '#DCFCE7' : '#FEE2E2' }]}>
                            <Text style={[styles.badgeText, { color: item.delta > 0 ? '#166534' : '#991B1B' }]}>
                                {item.delta > 0 ? '+' : ''}{item.delta}
                            </Text>
                        </View>
                    )}

                    {/* Distance Badge (Search) */}
                    {item.distance !== undefined && (
                        <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                            <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
                                dist: {Number(item.distance).toFixed(4)}
                            </Text>
                        </View>
                    )}

                    {/* Status Badge */}
                    <View style={[styles.badge, { backgroundColor: item.synced ? '#D1FAE5' : '#F3F4F6' }]}>
                        <Text style={styles.badgeText}>{item.status || 'syncing'}</Text>
                    </View>
                </View>
            </View>

            {/* Content Body (Payload) */}
            <Text style={styles.body}>{content}</Text>

            {/* Footer: Timestamp */}
            <Text style={styles.footer}>{new Date(item.ts).toLocaleString()}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        // Minimal design: No border, no shadow, no background color (transparent)
        paddingVertical: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    streamId: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#6B7280',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden', // for borderRadius on Text
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 99,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#374151',
        textTransform: 'uppercase',
    },
    body: {
        fontSize: 15, // Slightly smaller than "Hero" text
        color: '#1F2937',
        lineHeight: 22,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', // Monospace for JSON/Payload
    },
    footer: {
        marginTop: 8,
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'right',
    },
});
