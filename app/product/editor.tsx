import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Switch,
    Platform,
    Alert,
    ActivityIndicator,
    InteractionManager,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Crypto from 'expo-crypto'
import { UcpProduct } from '../../src/types/ucp'
import { db } from '../../src/db/client'
import { OR } from '../../src/db/schema'
import { eq } from 'drizzle-orm'

// --- Initial UCP Data Template ---
const INITIAL_PRODUCT: Partial<UcpProduct> = {
    ucp: {
        version: '2026-01-11',
        capability: 'dev.ucp.shopping.catalog',
        spec: 'https://ucp.dev/specs/shopping/catalog',
    },
    identifier: {
        sku: '',
        gtin: '',
        mpn: '',
        brand: { name: '', logo: '' },
    },
    classification: {
        category: '',
        category_id: '',
        google_product_category: '',
        tags: [],
        breadcrumbs: [],
    },
    content: {
        title: '',
        description: '',
        short_description: '',
        rich_content: { bullet_points: [], html_description: '', story: '' },
        media: { images: [], videos: [], three_sixty_view: '' },
    },
    pricing: {
        currency: 'USD',
        base_price: 0,
        display_price: '',
        comparison_price: 0,
        price_valid_until: '',
        price_per_unit: { amount: 0, unit: 'item' },
        volume_pricing: [],
    },
    availability: {
        status: 'in_stock',
        stock_level: 0,
        stock_threshold: 5,
        backorder_allowed: false,
        preorder: { available: false, release_date: '' },
        availability_timestamp: new Date().toISOString(),
    },
    variations: {
        matrix_enabled: false,
        attributes: [],
        variants: [],
    },
    specifications: {
        dimensions: { length: { value: 0, unit: 'cm' }, width: { value: 0, unit: 'cm' }, height: { value: 0, unit: 'cm' }, weight: { value: 0, unit: 'kg' } },
        material: '',
        capacity: { value: 0, unit: 'L' },
        warranty: { period: '', type: '' },
        compliance: [],
    },
    fulfillment: {
        shipping: { methods: [], free_shipping_threshold: 0 },
        pickup: { available: false, locations: [] }
    },
    discounts: {
        automatic_discounts: [],
        promo_codes: [],
    },
    taxonomies: {
        schema_org: {},
        google_merchant: {},
    },
    reviews: {
        aggregate_rating: { rating_value: 0, review_count: 0 },
        featured_reviews: [],
    },
    policies: {
        returns: { allowed: true, period_days: 30, condition: 'new', shipping_cost: 'free' },
        warranty: { period: '1 year', coverage: 'standard' },
    },
    metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: 'draft',
        tags_internal: [],
        data_quality_score: 1.0,
    },
    capabilities: {
        checkout: { supported: true, endpoint: '' },
        negotiation: { supported: false, features: [] },
        agent_actions: [],
    }
}

// Helper to update deeply nested state
const updateNested = (obj: any, path: string[], value: any): any => {
    if (path.length === 0) return value;
    const [head, ...tail] = path;
    return {
        ...obj,
        [head]: path.length === 1 ? value : updateNested(obj[head] || {}, tail, value)
    };
};


// Helper: Normalize legacy/flat data to UCP
const normalizeProduct = (data: any): Partial<UcpProduct> => {
    const normalized = { ...data };

    // Map legacy 'name' to 'content.title'
    if (!normalized.content?.title && normalized.name) {
        normalized.content = { ...normalized.content, title: normalized.name };
    }

    // Map legacy 'price' to 'pricing.base_price'
    if ((!normalized.pricing || !normalized.pricing.base_price) && normalized.price) {
        normalized.pricing = {
            ...normalized.pricing,
            base_price: Number(normalized.price),
            display_price: `$${normalized.price}`
        };
    }

    return normalized;
}

export default function ProductEditorScreen() {
    const { id, initialData } = useLocalSearchParams() // Get ID and optional initial Data
    const insets = useSafeAreaInsets();

    // Initialize with passed data if available to perform "Instant Open"
    const [product, setProduct] = useState<Partial<UcpProduct>>(() => {
        if (initialData && typeof initialData === 'string') {
            try {
                const parsed = JSON.parse(initialData);
                const normalized = normalizeProduct(parsed);
                return { ...INITIAL_PRODUCT, ...normalized };
            } catch (e) {
                console.warn("Failed to parse initialData", e);
            }
        }
        return INITIAL_PRODUCT;
    })

    const [activeSection, setActiveSection] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [isReady, setIsReady] = useState(false);

    // Load Data if ID exists
    useEffect(() => {
        if (!id) return;

        // Optimize: Defer heavy rendering until after navigation
        const task = InteractionManager.runAfterInteractions(() => {
            setIsReady(true);
        });

        const loadData = async () => {
            if (!initialData) setLoading(true);
            try {
                const result = await db.select().from(OR).where(eq(OR.id, String(id))).limit(1);
                if (result.length > 0) {
                    const loaded = result[0].payload;
                    const parsed = typeof loaded === 'string' ? JSON.parse(loaded) : loaded;
                    const normalized = normalizeProduct(parsed);

                    // Merge loaded data
                    setProduct(prev => ({ ...prev, ...normalized }));
                }
            } catch (e) {
                console.error('Failed to load product', e);
                Alert.alert('Error', 'Failed to load product data');
            } finally {
                setLoading(false);
            }
        };
        // Defer fetch to allow UI to paint first
        const t = setTimeout(loadData, 50);
        return () => clearTimeout(t);
    }, [id, initialData]);

    const handleChange = (path: string[], value: any) => {
        setProduct(prev => updateNested(prev, path, value));
    }

    const handleSave = async () => {
        try {
            if (id) {
                await db.update(OR)
                    .set({
                        payload: JSON.stringify(product),
                        ts: new Date()
                    })
                    .where(eq(OR.id, String(id)));
            } else {
                await db.insert(OR).values({
                    id: Crypto.randomUUID(),
                    streamId: 'default-stream', // Default for now
                    opcode: 501,
                    payload: JSON.stringify(product),
                    scope: 'private',
                    status: 'active',
                    ts: new Date(),
                })
            }
            Alert.alert('Saved', 'Product updated successfully.');
            router.back();
        } catch (e) {
            console.error('Save Error', e);
            Alert.alert('Error', 'Failed to save product.');
        }
    }

    const toggleSection = (title: string) => {
        setActiveSection(activeSection === title ? null : title);
    }

    const Section = ({ title, children, isOpenProp }: { title: string, children: React.ReactNode, isOpenProp?: boolean }) => {
        // Allow prop override or explicit control, relying on local simple toggling logic
        // For now, simpler: we'll render all, or use collapsible. 
        // Let's make them collapsible for sanity, but open by default if needed.
        const isOpen = activeSection === title || activeSection === null; // Open all by default effectively or clickable?
        // User asked for "all section as given". Let's show headers and make content collapsible but maybe default open or close?
        // Let's just stack them all open for "pure clean design" unless strictly requested to collapse.
        // Actually, a long scroll is better for "document" feel.
        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.fieldGroup}>
                    {children}
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />

            {/* --- Minimal Header --- */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>UCP Editor</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#000" />
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

                    {/* --- 0. UCP ROOT (Read Only) --- */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>UCP Metadata</Text>
                        <Text style={styles.valueText}>Version: {product.ucp?.version}</Text>
                    </View>

                    {/* --- 1. IDENTIFICATION --- */}
                    <Section title="Identification">
                        <Input label="Title" value={product.content?.title} onChange={(t) => handleChange(['content', 'title'], t)} />
                        <Input label="SKU" value={product.identifier?.sku} onChange={(t) => handleChange(['identifier', 'sku'], t)} />
                        <Row>
                            <Input label="GTIN" value={product.identifier?.gtin} onChange={(t) => handleChange(['identifier', 'gtin'], t)} />
                            <Input label="MPN" value={product.identifier?.mpn} onChange={(t) => handleChange(['identifier', 'mpn'], t)} />
                        </Row>
                        <Row>
                            <Input label="Brand Name" value={product.identifier?.brand?.name} onChange={(t) => handleChange(['identifier', 'brand', 'name'], t)} />
                            <Input label="Brand Logo URL" value={product.identifier?.brand?.logo} onChange={(t) => handleChange(['identifier', 'brand', 'logo'], t)} />
                        </Row>
                    </Section>

                    {/* --- DEFERRED SECTIONS --- */}
                    {isReady && (
                        <>
                            {/* --- 2. CLASSIFICATION --- */}
                            <Section title="Classification">
                                <Input label="Internal Category" value={product.classification?.category} onChange={(t) => handleChange(['classification', 'category'], t)} />
                                <Input label="Category ID" value={product.classification?.category_id} onChange={(t) => handleChange(['classification', 'category_id'], t)} />
                                <Input label="Google Product Category" value={product.classification?.google_product_category} onChange={(t) => handleChange(['classification', 'google_product_category'], t)} />
                                <Input label="Tags (comma sep)" placeholder="tag1, tag2" />
                            </Section>

                            {/* --- 3. CONTENT --- */}
                            <Section title="Content">
                                <Input label="Short Description" value={product.content?.short_description} onChange={(t) => handleChange(['content', 'short_description'], t)} />
                                <TextArea label="Full Description" value={product.content?.description} onChange={(t) => handleChange(['content', 'description'], t)} />

                                <Text style={styles.subHeader}>Rich Content</Text>
                                <TextArea label="Story" value={product.content?.rich_content?.story} onChange={(t) => handleChange(['content', 'rich_content', 'story'], t)} />

                                <Text style={styles.subHeader}>Media</Text>
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Image</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Video</Text></TouchableOpacity>
                                <Input label="360 View URL" value={product.content?.media?.three_sixty_view} onChange={(t) => handleChange(['content', 'media', 'three_sixty_view'], t)} />
                            </Section>

                            {/* --- 4. PRICING --- */}
                            <Section title="Pricing">
                                <Row>
                                    <Input label="Currency" value={product.pricing?.currency} onChange={(t) => handleChange(['pricing', 'currency'], t)} />
                                    <Input label="Base Price (cents)" keyboardType="numeric" value={String(product.pricing?.base_price)} onChange={(t) => handleChange(['pricing', 'base_price'], Number(t))} />
                                </Row>
                                <Row>
                                    <Input label="Display Price" value={product.pricing?.display_price} onChange={(t) => handleChange(['pricing', 'display_price'], t)} />
                                    <Input label="Comparison Price (MRP)" keyboardType="numeric" value={String(product.pricing?.comparison_price)} onChange={(t) => handleChange(['pricing', 'comparison_price'], Number(t))} />
                                </Row>
                                <Input label="Price Valid Until" placeholder="YYYY-MM-DD" value={product.pricing?.price_valid_until} onChange={(t) => handleChange(['pricing', 'price_valid_until'], t)} />
                            </Section>

                            {/* --- 5. AVAILABILITY --- */}
                            <Section title="Availability">
                                <Row>
                                    <Input label="Status" value={product.availability?.status} onChange={(t) => handleChange(['availability', 'status'], t)} />
                                    <Input label="Stock Level" keyboardType="numeric" value={String(product.availability?.stock_level)} onChange={(t) => handleChange(['availability', 'stock_level'], Number(t))} />
                                </Row>
                                <Row>
                                    <Input label="Threshold" keyboardType="numeric" value={String(product.availability?.stock_threshold)} onChange={(t) => handleChange(['availability', 'stock_threshold'], Number(t))} />
                                    <View style={styles.switchRow}>
                                        <Text style={styles.label}>Backorder Allowed</Text>
                                        <Switch value={product.availability?.backorder_allowed} onValueChange={(v) => handleChange(['availability', 'backorder_allowed'], v)} />
                                    </View>
                                </Row>
                                <Input label="Preorder Release Date" placeholder="YYYY-MM-DD" value={product.availability?.preorder?.release_date || ''} onChange={(t) => handleChange(['availability', 'preorder', 'release_date'], t)} />
                            </Section>

                            {/* --- 6. VARIATIONS --- */}
                            <Section title="Variations">
                                <View style={styles.switchRow}>
                                    <Text style={styles.label}>Matrix Enabled</Text>
                                    <Switch value={product.variations?.matrix_enabled} onValueChange={(v) => handleChange(['variations', 'matrix_enabled'], v)} />
                                </View>
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Define Attributes</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Variant</Text></TouchableOpacity>
                            </Section>

                            {/* --- 7. SPECIFICATIONS --- */}
                            <Section title="Specifications">
                                <Row>
                                    <Input label="Length (cm)" keyboardType="numeric" value={String(product.specifications?.dimensions?.length?.value)} onChange={(t) => handleChange(['specifications', 'dimensions', 'length', 'value'], Number(t))} />
                                    <Input label="Width (cm)" keyboardType="numeric" value={String(product.specifications?.dimensions?.width?.value)} onChange={(t) => handleChange(['specifications', 'dimensions', 'width', 'value'], Number(t))} />
                                </Row>
                                <Row>
                                    <Input label="Height (cm)" keyboardType="numeric" value={String(product.specifications?.dimensions?.height?.value)} onChange={(t) => handleChange(['specifications', 'dimensions', 'height', 'value'], Number(t))} />
                                    <Input label="Weight (kg)" keyboardType="numeric" value={String(product.specifications?.dimensions?.weight?.value)} onChange={(t) => handleChange(['specifications', 'dimensions', 'weight', 'value'], Number(t))} />
                                </Row>
                                <Input label="Material" value={product.specifications?.material} onChange={(t) => handleChange(['specifications', 'material'], t)} />
                                <Input label="Warranty Period" value={product.specifications?.warranty?.period} onChange={(t) => handleChange(['specifications', 'warranty', 'period'], t)} />
                            </Section>

                            {/* --- 8. FULFILLMENT --- */}
                            <Section title="Fulfillment">
                                <Input label="Free Shipping Threshold (cents)" keyboardType="numeric" value={String(product.fulfillment?.shipping?.free_shipping_threshold)} onChange={(t) => handleChange(['fulfillment', 'shipping', 'free_shipping_threshold'], Number(t))} />
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Shipping Method</Text></TouchableOpacity>
                                <View style={styles.switchRow}>
                                    <Text style={styles.label}>Pickup Available</Text>
                                    <Switch value={product.fulfillment?.pickup?.available} onValueChange={(v) => handleChange(['fulfillment', 'pickup', 'available'], v)} />
                                </View>
                            </Section>

                            {/* --- 9. DISCOUNTS --- */}
                            <Section title="Discounts">
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Auto Discount</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.addButton}><Text style={styles.addButtonText}>+ Add Promo Code</Text></TouchableOpacity>
                            </Section>

                            {/* --- 10. REVIEWS --- */}
                            <Section title="Reviews">
                                <Row>
                                    <Input label="Rating Value" keyboardType="numeric" value={String(product.reviews?.aggregate_rating?.rating_value)} onChange={(t) => handleChange(['reviews', 'aggregate_rating', 'rating_value'], Number(t))} />
                                    <Input label="Review Count" keyboardType="numeric" value={String(product.reviews?.aggregate_rating?.review_count)} onChange={(t) => handleChange(['reviews', 'aggregate_rating', 'review_count'], Number(t))} />
                                </Row>
                            </Section>

                            {/* --- 11. POLICIES --- */}
                            <Section title="Policies">
                                <View style={styles.switchRow}>
                                    <Text style={styles.label}>Returns Allowed</Text>
                                    <Switch value={product.policies?.returns?.allowed} onValueChange={(v) => handleChange(['policies', 'returns', 'allowed'], v)} />
                                </View>
                                <Input label="Return Period (Days)" keyboardType="numeric" value={String(product.policies?.returns?.period_days)} onChange={(t) => handleChange(['policies', 'returns', 'period_days'], Number(t))} />
                                <Input label="Return Condition" value={product.policies?.returns?.condition} onChange={(t) => handleChange(['policies', 'returns', 'condition'], t)} />
                            </Section>

                            {/* --- 12. METADATA --- */}
                            <Section title="Metadata">
                                <Input label="Visibility" value={product.metadata?.visibility} onChange={(t) => handleChange(['metadata', 'visibility'], t)} />
                                <Input label="Data Quality Score" value={String(product.metadata?.data_quality_score)} editable={false} />
                                <Text style={styles.valueText}>Created: {product.metadata?.created_at}</Text>
                            </Section>

                            {/* --- 13. CAPABILITIES --- */}
                            <Section title="Capabilities">
                                <View style={styles.switchRow}>
                                    <Text style={styles.label}>Checkout Supported</Text>
                                    <Switch value={product.capabilities?.checkout?.supported} onValueChange={(v) => handleChange(['capabilities', 'checkout', 'supported'], v)} />
                                </View>
                                <Input label="Checkout Endpoint" value={product.capabilities?.checkout?.endpoint} onChange={(t) => handleChange(['capabilities', 'checkout', 'endpoint'], t)} />
                                <View style={styles.switchRow}>
                                    <Text style={styles.label}>Negotiation Supported</Text>
                                    <Switch value={product.capabilities?.negotiation?.supported} onValueChange={(v) => handleChange(['capabilities', 'negotiation', 'supported'], v)} />
                                </View>
                            </Section>
                        </>
                    )}

                    {/* --- LOADING INDICATOR --- */}
                    {!isReady && (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#999" />
                        </View>
                    )}

                </ScrollView >
            )
            }
        </View >
    )
}

// --- MICRO COMPONENTS ---
const Input = ({ label, value, onChange, placeholder, keyboardType, editable = true }: any) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, !editable && styles.disabledInput]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            keyboardType={keyboardType}
            editable={editable}
        />
    </View>
)

const TextArea = ({ label, value, onChange, placeholder }: any) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
            style={[styles.input, styles.textArea]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
        />
    </View>
)

const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.row}>{children}</View>
)

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        backgroundColor: '#FFF',
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
    },
    saveBtn: {
        backgroundColor: '#000',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    saveBtnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingBottom: 80,
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#374151',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },
    subHeader: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginTop: 12,
        marginBottom: 8,
    },
    fieldGroup: {
        gap: 16,
    },
    inputContainer: {
        flex: 1,
    },
    label: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6B7280',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: '#111827',
    },
    disabledInput: {
        backgroundColor: '#F3F4F6',
        color: '#9CA3AF',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    addButtonText: {
        color: '#2563EB',
        fontSize: 14,
        fontWeight: '500',
    },
    valueText: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 4,
    },
})
