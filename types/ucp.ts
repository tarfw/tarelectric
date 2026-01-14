export interface UcpPrice {
    value: string; // "19.99"
    currency: string; // "USD"
}

export interface UcpImage {
    url: string;
    alt_text?: string;
}

export interface UcpAttribute {
    name: string;
    value: string;
}

export interface UcpIdentifiers {
    gtin?: string; // Global Trade Item Number (UPC, EAN, ISBN) - The "Universal ID"
    mpn?: string;  // Manufacturer Part Number
    sku?: string;  // Stock Keeping Unit (Merchant specific)
}

export interface UcpProduct {
    id: string; // The specific ID used for checkout (e.g. Shopify Variant ID: "gid://shopify/ProductVariant/...")
    universalId?: string; // The abstract product ID (e.g. Shopify Product ID: "gid://shopify/p/...")
    identifiers?: UcpIdentifiers; // Standard global identifiers (GTIN, UPC, EAN)
    url?: string;
    title: string;
    subtitle?: string;
    description?: string;
    brand?: string;
    images: UcpImage[];
    price: UcpPrice;
    attributes?: UcpAttribute[];
}

export interface UcpLineItem {
    id: string; // Cart Item ID (distinct from Product ID)
    quantity: number;
    item: UcpProduct;
    total?: UcpPrice;
}
