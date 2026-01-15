export interface UcpRoot {
    ucp: {
        version: string;
        capability: string;
        spec: string;
    };
    product: UcpProduct;
    capabilities: UcpCapabilities;
}

export interface UcpProduct {
    ucp?: {
        version: string;
        capability: string;
        spec: string;
    };
    id: string;
    merchant_id: string;
    identifier?: {
        sku: string;
        gtin?: string;
        mpn?: string;
        brand: {
            name: string;
            logo?: string;
        };
    };
    classification: {
        category: string;
        category_id: string;
        google_product_category?: string;
        tags: string[];
        breadcrumbs: { name: string; url: string }[];
    };
    content: {
        title: string;
        description: string;
        short_description: string;
        rich_content?: {
            bullet_points: string[];
            html_description?: string;
            story?: string;
        };
        media: {
            images: UcpImage[];
            videos?: UcpVideo[];
            three_sixty_view?: string;
        };
    };
    pricing: {
        currency: string;
        base_price: number;
        display_price: string;
        price_valid_until?: string;
        comparison_price?: number;
        price_per_unit?: { amount: number; unit: string };
        volume_pricing?: { quantity_min: number; price: number }[];
    };
    availability: {
        status: 'in_stock' | 'out_of_stock' | 'preorder';
        stock_level: number;
        stock_threshold?: number;
        backorder_allowed: boolean;
        preorder?: { available: boolean; release_date?: string | null };
        availability_timestamp: string;
    };
    variations?: {
        matrix_enabled: boolean;
        attributes: UcpVariantAttribute[];
        variants: UcpVariant[];
    };
    specifications?: Record<string, any>;
    fulfillment?: {
        shipping: {
            methods: UcpShippingMethod[];
            free_shipping_threshold?: number;
        };
        pickup?: {
            available: boolean;
            locations: any[];
        };
    };
    metadata: {
        created_at: string;
        updated_at: string;
        visibility: 'published' | 'draft' | 'archived';
        tags_internal?: string[];
        data_quality_score?: number;
    };
}

export interface UcpImage {
    url: string;
    alt?: string;
    type: 'primary' | 'secondary' | 'detail';
    dimensions?: { width: number; height: number };
    format?: string;
    size?: string;
}

export interface UcpVideo {
    url: string;
    type: string;
    duration?: string;
    thumbnail?: string;
}

export interface UcpVariantAttribute {
    name: string;
    id: string;
    options: {
        value: string;
        id: string;
        swatch?: { type: 'color' | 'image'; value: string };
    }[];
}

export interface UcpVariant {
    id: string;
    sku: string;
    attributes: Record<string, string>;
    price: number;
    stock: number;
    availability: string;
}

export interface UcpShippingMethod {
    id: string;
    name: string;
    price: number;
    currency: string;
    delivery_estimate: {
        minimum: { unit: string; value: number };
        maximum: { unit: string; value: number };
    };
    regions: string[];
}

export interface UcpCapabilities {
    checkout: {
        supported: boolean;
        endpoint: string;
    };
    negotiation?: {
        supported: boolean;
        features: string[];
    };
    agent_actions: {
        type: string;
        target: string;
        actionPlatform: string;
    }[];
}
