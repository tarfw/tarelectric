import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../db/client';
import { OR } from '../db/schema';
import { syncService } from '../services/SyncService';
import * as Crypto from 'expo-crypto';

interface GenUiCardProps {
    opcode: number;
    label: string;
    payload: any;
    onSaved: () => void;
}

export function GenUiCard({ opcode, label, payload, onSaved }: GenUiCardProps) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Common State
    const [qty, setQty] = useState(payload?.qty || 1);
    const [amount, setAmount] = useState(payload?.amount?.toString() || '');
    const [text, setText] = useState(payload?.text || '');
    const [name, setName] = useState(payload?.name || ''); // For product/variant
    const [price, setPrice] = useState(payload?.price?.toString() || ''); // For product/variant

    // Determine Logic Type based on Opcode Range
    const isStockOp = opcode >= 100 && opcode < 200;
    const isInvoiceOp = opcode >= 200 && opcode < 300;
    const isTaskOp = opcode >= 300 && opcode < 400;
    const isAccountOp = opcode >= 400 && opcode < 500;
    const isProductOp = opcode >= 500 && opcode < 600;

    const handleSave = async () => {
        setSaving(true);
        try {
            // 1. Calculate Delta
            let delta = 0;
            if (isStockOp) {
                // Opcode 101 (In) -> +Qty
                // Opcode 102 (Sale) -> -Qty
                // Opcode 103 (Return) -> +Qty
                if (opcode === 101 || opcode === 103) delta = qty;
                if (opcode === 102) delta = -qty;
                // 104 (Adjust) requires positive/negative input, defaulting to +qty for now
                if (opcode === 104) delta = qty;
            }

            // 2. Determine StreamID (Tracing)
            // If product name exists (e.g. from 501 or extracted from 101), use it as streamId
            let targetStreamId = 'default-stream';
            // Simple slugify: "Cappucino" -> "product-cappucino"
            if (name) {
                targetStreamId = `product-${name.toLowerCase().replace(/\s+/g, '-')}`;
            } else if (payload.name) {
                targetStreamId = `product-${payload.name.toLowerCase().replace(/\s+/g, '-')}`;
            }

            // 3. Construct Clean Payload (No unwanted text fields)
            const finalPayload = {
                ...payload,
                qty: isStockOp ? qty : undefined,
                amount: (isInvoiceOp || isAccountOp) ? (parseFloat(amount) || 0) : undefined,
                name: isProductOp ? name : undefined,
                price: isProductOp ? (parseFloat(price) || 0) : undefined,
            };

            // Clean up undefined, text, and original_text if they slipped in from ...payload
            delete finalPayload.text;
            delete finalPayload.original_text;
            Object.keys(finalPayload).forEach(key => finalPayload[key] === undefined && delete finalPayload[key]);

            const newMemory = {
                id: Crypto.randomUUID(),
                streamId: targetStreamId,
                opcode: opcode,
                delta: delta !== 0 ? delta : null,
                payload: JSON.stringify(finalPayload),
                scope: 'private',
                status: 'active',
                ts: new Date(),
            };

            await db.insert(OR).values(newMemory);
            await syncService.enqueueMutation('OR', 'INSERT', newMemory);

            setSaved(true);
            onSaved();
        } catch (e) {
            console.error(e);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const isReadOnly = saved || saving;

    return (
        <View style={[styles.card, saved && styles.cardSaved]}>
            {/* Header */}
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleBox}>
                    <Text style={styles.label}>{label}</Text>
                    {/* Minimal: No status text, no opcode */}
                </View>
                {saved && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>SAVED</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    </View>
                )}
            </View>

            {/* DYNAMIC BODY */}
            <View style={[styles.body, saved && { opacity: 0.6 }]}>

                {/* 1. STOCK OPS (Qty & Product) */}
                {isStockOp && (
                    <View style={styles.fieldColumn}>
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Quantity</Text>
                            <View style={styles.stepper}>
                                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(Math.max(1, qty - 1))} disabled={isReadOnly}>
                                    <Ionicons name="remove" size={20} color={isReadOnly ? "#9CA3AF" : "#4B5563"} />
                                </TouchableOpacity>
                                <Text style={styles.qtyValue}>{qty}</Text>
                                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(qty + 1)} disabled={isReadOnly}>
                                    <Ionicons name="add" size={20} color={isReadOnly ? "#9CA3AF" : "#4B5563"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {/* Product Name for Tracing */}
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.fieldLabel}>Product / Item</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Coke (Required for tracing)"
                                editable={!isReadOnly}
                            />
                        </View>
                    </View>
                )}

                {/* 2. INVOICE / ACCOUNT OPS (Amount) */}
                {(isInvoiceOp || isAccountOp) && (
                    <View style={styles.fieldColumn}>
                        <Text style={styles.fieldLabel}>Amount ($)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            editable={!isReadOnly}
                        />
                    </View>
                )}

                {/* 3. PRODUCT OPS (Name & Price) */}
                {isProductOp && (
                    <>
                        <View style={styles.fieldColumn}>
                            <Text style={styles.fieldLabel}>Product Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Diet Coke"
                                editable={!isReadOnly}
                            />
                        </View>
                        <View style={[styles.fieldColumn, { marginTop: 12 }]}>
                            <Text style={styles.fieldLabel}>Price ($)</Text>
                            <TextInput
                                style={styles.input}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                                placeholder="0.00"
                                editable={!isReadOnly}
                            />
                        </View>
                    </>
                )}

                {/* 4. TASK OPS (Text Description/Assignee) */}
                {isTaskOp && (
                    <View style={styles.fieldColumn}>
                        <Text style={styles.fieldLabel}>Task Details</Text>
                        {/* We use the 'text' state which is initialized from payload.text */}
                        <Text style={styles.readOnlyText}>{text}</Text>
                    </View>
                )}

            </View>

            {/* Footer / Action */}
            {!saved && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveText}>Confirm & Save</Text>}
                </TouchableOpacity>
            )}

            {/* Minimal: Saved state shown in header */}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        // No elevation as requested
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 12,
    },
    opcodeText: {
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
    },
    titleBox: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    subLabel: {
        fontSize: 12,
        color: '#6B7280',
    },

    // Body & Fields
    body: {
        marginBottom: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 12,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    fieldColumn: {
        gap: 8,
    },
    fieldLabel: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        color: '#111827',
    },

    // Stepper
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    qtyValue: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        minWidth: 24,
        textAlign: 'center',
    },
    readOnlyText: {
        fontSize: 15,
        color: '#374151',
        fontStyle: 'italic',
    },

    // Save Button
    saveBtn: {
        backgroundColor: '#0F172A', // Dark / Premium feel
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    // Saved States
    cardSaved: {
        borderColor: '#D1FAE5',
        backgroundColor: '#F0FDF4',
    },
    iconBoxSaved: {
        backgroundColor: '#D1FAE5',
    },
    textSaved: {
        color: '#065F46',
    },
    savedFooter: {
        marginTop: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedFooterText: {
        color: '#059669',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});
