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
    isInitialSaved?: boolean; // New prop for history view
}

export function GenUiCard({ opcode, label, payload, onSaved, isInitialSaved = false }: GenUiCardProps) {
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(isInitialSaved);

    // Common State
    const [qty, setQty] = useState(payload?.qty || 1);
    const [amount, setAmount] = useState(payload?.amount?.toString() || '');
    const [text, setText] = useState(payload?.text || '');
    const [name, setName] = useState(payload?.name || ''); // For product/variant
    const [price, setPrice] = useState(payload?.price || 0); // For product/variant, number for stepper

    // Edit Mode State for Minimal Designs
    const [isEditingName, setIsEditingName] = useState(false);

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
                if (opcode === 101 || opcode === 103) delta = qty;
                if (opcode === 102) delta = -qty;
                if (opcode === 104) delta = qty;
            }

            // 2. Determine StreamID (Tracing)
            let targetStreamId = 'default-stream';
            if (name) {
                targetStreamId = `product-${name.toLowerCase().replace(/\s+/g, '-')}`;
            } else if (payload.name) {
                targetStreamId = `product-${payload.name.toLowerCase().replace(/\s+/g, '-')}`;
            }

            // 3. Construct Clean Payload
            let finalPayload: any = {
                ...payload,
                qty: isStockOp ? qty : undefined,
                amount: (isInvoiceOp || isAccountOp) ? (parseFloat(amount) || 0) : undefined,
            };

            // UCP Transformation for Product (501)
            if (isProductOp) {
                const ucpPayload = {
                    ucp: {
                        version: '2026-01-11',
                        capability: 'dev.ucp.shopping.catalog',
                        spec: 'https://ucp.dev/specs/shopping/catalog',
                    },
                    identifier: {
                        sku: '',
                        brand: { name: 'Generic', logo: '' },
                    },
                    content: {
                        title: name || 'Untitled Product', // Map Name
                        description: '',
                        short_description: '',
                    },
                    pricing: {
                        currency: 'USD',
                        base_price: price || 0, // Map Price
                        display_price: `$${price || 0}`,
                        price_per_unit: { amount: price || 0, unit: 'item' }
                    },
                    availability: {
                        status: 'in_stock',
                        stock_level: 0,
                        backorder_allowed: false,
                        availability_timestamp: new Date().toISOString(),
                    },
                    metadata: {
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        visibility: 'draft',
                    }
                };
                finalPayload = ucpPayload;
            } else {
                // Cleanup for non-UCP items
                delete finalPayload.text;
                delete finalPayload.original_text;
                // Remove undefined keys
                Object.keys(finalPayload).forEach(key => finalPayload[key] === undefined && delete finalPayload[key]);
            }

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

    // --- RENDER HELPERS ---

    // Minimal Stepper for Price/Qty
    const StepperControl = ({ value, onChange, prefix = '', step = 1 }: { value: number, onChange: (v: number) => void, prefix?: string, step?: number }) => (
        <View style={styles.stepperContainer}>
            <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange(Math.max(0, value - step))}
                disabled={isReadOnly}
            >
                <Ionicons name="remove" size={24} color="#111827" />
            </TouchableOpacity>

            <Text style={styles.stepperValue}>{prefix}{value}</Text>

            <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => onChange(value + step)}
                disabled={isReadOnly}
            >
                <Ionicons name="add" size={24} color="#111827" />
            </TouchableOpacity>
        </View>
    );

    // --- MAIN RENDER ---

    // Auto-Save on Mount
    useEffect(() => {
        if (isProductOp && !saved && !saving) {
            handleSave();
        }
    }, []);

    if (isProductOp) {
        return (
            <View style={styles.minimalCard}>

                {/* Small Label */}
                <Text style={styles.minimalPropLabel}>Product</Text>

                {/* Main Row: [Name] ... [Price] */}
                <View style={styles.minimalRow}>

                    {/* Name (Flex to Wrap) */}
                    <View style={{ flex: 1, marginRight: 16 }}>
                        {isEditingName ? (
                            <TextInput
                                style={styles.minimalInput}
                                value={name}
                                onChangeText={setName}
                                autoFocus
                                onBlur={() => setIsEditingName(false)}
                                onSubmitEditing={() => setIsEditingName(false)}
                                multiline
                            />
                        ) : (
                            <TouchableOpacity onPress={() => setIsEditingName(true)}>
                                <Text style={styles.heroName}>{name || '...'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Price (Right Aligned) */}
                    <Text style={styles.heroPrice}>${price}</Text>
                </View>

            </View>
        );
    }

    // --- FALLBACK FOR OTHER OTHERS (Stock, Invoice, etc) ---
    // Keeping the original "Box" design for now unless requested otherwise, 
    // but cleaning it up slightly to match the new "less is more" vibe.

    return (
        <View style={[styles.card, saved && styles.cardSaved]}>
            <View style={styles.header}>
                <View style={styles.titleBox}>
                    <Text style={styles.label}>{label}</Text>
                </View>
                {saved && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>SAVED</Text>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    </View>
                )}
            </View>

            <View style={[styles.body, saved && { opacity: 0.6 }]}>
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
                        <View style={{ marginTop: 12 }}>
                            <Text style={styles.fieldLabel}>Product / Item</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="e.g. Coke"
                                editable={!isReadOnly}
                            />
                        </View>
                    </View>
                )}

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

                {isTaskOp && (
                    <View style={styles.fieldColumn}>
                        <Text style={styles.readOnlyText}>{text}</Text>
                    </View>
                )}
            </View>

            {!saved && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveText}>Confirm & Save</Text>}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    // --- MINIMAL DESIGN STYLES ---
    minimalCard: {
        width: '100%',
        backgroundColor: 'transparent',
        paddingVertical: 12, // Reduced
        paddingHorizontal: 4,
    },
    minimalPropLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    minimalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroName: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -1,
        lineHeight: 32,
    },
    heroPrice: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    minimalInput: {
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        borderBottomWidth: 2,
        borderBottomColor: '#0F172A',
        paddingVertical: 0,
        flex: 1, // Let it fill
    },
    minimalBody: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 16,
    },
    minimalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        width: '100%',
    },
    stepperBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValue: {
        fontSize: 64, // Big hero number
        fontWeight: '700',
        color: '#111827',
        fontVariant: ['tabular-nums'],
    },
    minimalFooter: {
        marginTop: 32,
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    textActionBtn: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A', // Primary dark
        textDecorationLine: 'underline',
    },
    savedTextSimple: {
        fontSize: 16,
        fontWeight: '600',
        color: '#059669',
    },

    // --- LEGACY / OTHER CARD STYLES ---
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    // ... existing styles kept for retro-compatibility if needed
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleBox: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
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
    saveBtn: {
        backgroundColor: '#0F172A',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    cardSaved: {
        borderColor: '#D1FAE5',
        backgroundColor: '#F0FDF4',
    },
});
