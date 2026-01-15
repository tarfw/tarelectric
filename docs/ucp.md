# Universal Commerce Protocol (UCP)

Excellent — this is a **full canonical UCP product document**.
Below is a **complete, grouped, one-by-one explanation** of *every single field*, exactly how an AI agent / universal commerce network understands it.

---

# 🧠 UCP ROOT HEADER

## `ucp`

This block declares **what protocol this document speaks**.

| Field        | Meaning                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `version`    | Which UCP schema version this document follows                                                     |
| `capability` | What this document represents → `shopping.catalog` means “this endpoint exposes sellable products” |
| `spec`       | Official spec URL so any AI agent can load the rules                                               |

👉 This makes your merchant globally discoverable by AI agents.

---

# 🧾 PRODUCT ROOT OBJECT

## `product.id`

**Global immutable product identity** (UUID).
Never changes.
Variants hang under this.

---

## `merchant_id`

Unique merchant namespace inside UCP.
Used in universal IDs like:

```
merchant:product:variant
```

---

# 🏷 IDENTIFICATION

## `identifier`

| Field        | Meaning                                       |
| ------------ | --------------------------------------------- |
| `sku`        | Merchant internal SKU                         |
| `gtin`       | Barcode / EAN / UPC universal retail identity |
| `mpn`        | Manufacturer Part Number                      |
| `brand.name` | Brand name                                    |
| `brand.logo` | Brand logo URL                                |

👉 This makes your product recognizable by Amazon, Google, POS, warehouses, agents.

---

# 🧭 CLASSIFICATION

| Field                     | Purpose                             |
| ------------------------- | ----------------------------------- |
| `category`                | Human readable category             |
| `category_id`             | Your internal taxonomy ID           |
| `google_product_category` | Google Merchant canonical taxonomy  |
| `tags`                    | Search & filter tags                |
| `breadcrumbs`             | Navigation tree for UI & AI context |

👉 Allows AI agents to understand **what kind of thing this is**.

---

# 📝 CONTENT (Marketing brain)

## `content.title`

Primary listing title.

## `description`

Long SEO description.

## `short_description`

One-line summary.

---

## `rich_content`

| Field              | Meaning                    |
| ------------------ | -------------------------- |
| `bullet_points`    | Key feature bullets        |
| `html_description` | Full HTML formatted body   |
| `story`            | Brand storytelling content |

---

## `media`

### `images[]`

Each image contains:

| Field        | Meaning                      |
| ------------ | ---------------------------- |
| `url`        | CDN image URL                |
| `alt`        | Accessibility / SEO          |
| `type`       | primary / secondary / detail |
| `dimensions` | Image size                   |
| `format`     | mime                         |
| `size`       | file size                    |

### `videos[]`

Product demo videos.

### `360_view`

Spin viewer.

---

# 💰 PRICING

| Field               | Meaning                     |
| ------------------- | --------------------------- |
| `currency`          | ISO currency                |
| `base_price`        | Integer minor units (cents) |
| `display_price`     | UI formatted                |
| `price_valid_until` | Offer expiry                |
| `comparison_price`  | MRP                         |
| `price_per_unit`    | Unit economics              |
| `volume_pricing`    | Bulk discounts              |

---

# 📦 AVAILABILITY

| Field                    | Meaning                 |
| ------------------------ | ----------------------- |
| `status`                 | in_stock / out_of_stock |
| `stock_level`            | Live quantity           |
| `stock_threshold`        | Low stock warning       |
| `backorder_allowed`      | Can oversell            |
| `preorder`               | Future launch info      |
| `availability_timestamp` | Last update time        |

---

# 🔀 VARIATIONS

## `attributes`

Defines variation dimensions.

| Example                          |
| -------------------------------- |
| Color → Black, Silver, Rose Gold |
| Size → Carry, Medium, Large      |

---

## `variants[]`

Each row = **real sellable SKU**.

| Field          | Meaning                    |
| -------------- | -------------------------- |
| `id`           | Globally unique variant ID |
| `sku`          | Variant SKU                |
| `attributes`   | Selected options           |
| `price`        | Variant price              |
| `stock`        | Variant stock              |
| `availability` | Variant availability       |

👉 This is what checkout uses.

---

# 📐 SPECIFICATIONS

| Field        | Meaning        |
| ------------ | -------------- |
| `dimensions` | Physical size  |
| `weight`     | Weight         |
| `material`   | Build          |
| `capacity`   | Volume         |
| `warranty`   | Coverage       |
| `compliance` | TSA / IATA etc |

---

# 🚚 FULFILLMENT

## Shipping methods

Each shipping method defines:

| Field               | Meaning          |
| ------------------- | ---------------- |
| `price`             | Shipping fee     |
| `delivery_estimate` | Min/max days     |
| `regions`           | Where it applies |

---

## Pickup

Store-level inventory for in-person pickup.

---

# 🏷 DISCOUNTS

| Type                  | Meaning      |
| --------------------- | ------------ |
| `automatic_discounts` | Auto applied |
| `promo_codes`         | Coupon based |

---

# 🌍 TAXONOMIES

Schema.org & Google Merchant structured data for search engines & shopping feeds.

---

# ⭐ REVIEWS

| Field              | Meaning           |
| ------------------ | ----------------- |
| `aggregate_rating` | Overall score     |
| `featured_reviews` | Highlight reviews |

---

# 📜 POLICIES

Returns & warranty conditions.

---

# 🧬 METADATA

| Field                | Meaning           |
| -------------------- | ----------------- |
| `created_at`         | Creation time     |
| `updated_at`         | Last update       |
| `visibility`         | published / draft |
| `tags_internal`      | Internal flags    |
| `data_quality_score` | AI trust score    |

---

# 🤖 CAPABILITIES (This is the REAL magic)

## `checkout.supported`

Declares **this merchant can accept AI checkout directly**.

## `endpoint`

Where agents send orders.

---

## `agent_actions`

These expose your shop as **callable actions** to AI agents:

| Action      | Meaning                  |
| ----------- | ------------------------ |
| `AddToCart` | AI can add items         |
| `BuyAction` | AI can complete purchase |

---

# 🌎 WHAT THIS MEANS

This single JSON document makes your product:

• Discoverable
• Searchable
• Comparable
• Negotiable
• Buyable
• Automatable
• Agent-callable

By **every AI, marketplace, POS, and commerce bot in the world**.

---
# Example Payload

```json
{
  "ucp": {
    "version": "2026-01-11",
    "capability": "dev.ucp.shopping.catalog",
    "spec": "https://ucp.dev/specs/shopping/catalog"
  },
  "product": {
    "id": "prod_9f8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
    "merchant_id": "merchant_12345",
    "identifier": {
      "sku": "MONOS-PRO-CARRY-ON-BLK-2025",
      "gtin": "00860002852346",
      "mpn": "MONOS-PRO-001",
      "brand": {
        "name": "Monos",
        "logo": "https://cdn.example.com/brands/monos-logo.png"
      }
    },
    "classification": {
      "category": "Luggage & Travel Gear > Suitcases",
      "category_id": "cat_luggage_001",
      "google_product_category": "Home & Garden > Luggage & Bags > Suitcases",
      "tags": ["carry-on", "premium", "polycarbonate", "TSA-approved"],
      "breadcrumbs": [
        {"name": "Home", "url": "https://example.com"},
        {"name": "Luggage", "url": "https://example.com/luggage"},
        {"name": "Carry-On Suitcases", "url": "https://example.com/luggage/carry-on"}
      ]
    },
    "content": {
      "title": "Monos Carry-On Pro Suitcase - Black",
      "description": "The perfect carry-on suitcase for discerning travelers. Features a durable polycarbonate shell, whisper-quiet wheels, and a built-in compression system.",
      "short_description": "Premium carry-on with polycarbonate shell and TSA lock",
      "rich_content": {
        "bullet_points": [
          "Ultra-lightweight polycarbonate shell (3.2kg)",
          "360° spinner wheels with Japanese stainless steel bearings",
          "Built-in compression system saves 25% space",
          "TSA-approved combination lock",
          "Laundry bag and shoe compartment included"
        ],
        "html_description": "<p>The Monos Carry-On Pro is engineered for...</p>",
        "story": "Designed in Vancouver, tested on 100+ global flights"
      },
      "media": {
        "images": [
          {
            "url": "https://cdn.example.com/products/monos-pro/black/front.jpg",
            "alt": "Front view of black Monos Carry-On Pro suitcase",
            "type": "primary",
            "dimensions": {"width": 1200, "height": 1500},
            "format": "image/jpeg",
            "size": "2.3MB"
          },
          {
            "url": "https://cdn.example.com/products/monos-pro/black/side.jpg",
            "alt": "Side view showing spinner wheels",
            "type": "secondary",
            "dimensions": {"width": 1200, "height": 1500}
          },
          {
            "url": "https://cdn.example.com/products/monos-pro/black/interior.jpg",
            "alt": "Interior with compression system",
            "type": "detail",
            "dimensions": {"width": 1200, "height": 1500}
          }
        ],
        "videos": [
          {
            "url": "https://cdn.example.com/products/monos-pro/demo.mp4",
            "type": "product_demo",
            "duration": "1:45",
            "thumbnail": "https://cdn.example.com/products/monos-pro/demo-thumb.jpg"
          }
        ],
        "360_view": "https://cdn.example.com/products/monos-pro/black/360.spin"
      }
    },
    "pricing": {
      "currency": "USD",
      "base_price": 26550,
      "display_price": "$265.50",
      "price_valid_until": "2026-12-31",
      "comparison_price": 29500,
      "price_per_unit": {
        "amount": 26550,
        "unit": "item"
      },
      "volume_pricing": [
        {"quantity_min": 1, "price": 26550},
        {"quantity_min": 2, "price": 23900},
        {"quantity_min": 5, "price": 21250}
      ]
    },
    "availability": {
      "status": "in_stock",
      "stock_level": 47,
      "stock_threshold": 10,
      "backorder_allowed": false,
      "preorder": {
        "available": false,
        "release_date": null
      },
      "availability_timestamp": "2026-01-15T14:30:00Z"
    },
    "variations": {
      "matrix_enabled": true,
      "attributes": [
        {
          "name": "Color",
          "id": "color",
          "options": [
            {
              "value": "Black",
              "id": "BLK",
              "swatch": {"type": "color", "value": "#000000"}
            },
            {
              "value": "Silver",
              "id": "SLV",
              "swatch": {"type": "color", "value": "#C0C0C0"}
            },
            {
              "value": "Rose Gold",
              "id": "RG",
              "swatch": {"type": "color", "value": "#E0BFB8"}
            }
          ]
        },
        {
          "name": "Size",
          "id": "size",
          "options": [
            {"value": "Carry-On", "id": "CARRY"},
            {"value": "Medium", "id": "MED"},
            {"value": "Large", "id": "LGE"}
          ]
        }
      ],
      "variants": [
        {
          "id": "var_9f8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d-BLK-CARRY",
          "sku": "MONOS-PRO-CARRY-ON-BLK-2025",
          "attributes": {"color": "BLK", "size": "CARRY"},
          "price": 26550,
          "stock": 47,
          "availability": "in_stock"
        },
        {
          "id": "var_9f8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d-SLV-CARRY",
          "sku": "MONOS-PRO-CARRY-ON-SLV-2025",
          "attributes": {"color": "SLV", "size": "CARRY"},
          "price": 26550,
          "stock": 23,
          "availability": "in_stock"
        }
      ]
    },
    "specifications": {
      "dimensions": {
        "length": {"value": 55, "unit": "cm"},
        "width": {"value": 35, "unit": "cm"},
        "height": {"value": 22, "unit": "cm"},
        "weight": {"value": 3.2, "unit": "kg"}
      },
      "material": "Polycarbonate shell with aluminum handle",
      "capacity": {"value": 38, "unit": "L"},
      "warranty": {"period": "10 years", "type": "manufacturer"},
      "compliance": [
        {"standard": "TSA", "description": "TSA-approved lock"},
        {"standard": "IATA", "description": "IATA carry-on size compliant"}
      ]
    },
    "fulfillment": {
      "shipping": {
        "methods": [
          {
            "id": "ship_standard",
            "name": "Standard Shipping",
            "price": 0,
            "currency": "USD",
            "delivery_estimate": {
              "minimum": {"unit": "business_day", "value": 3},
              "maximum": {"unit": "business_day", "value": 7}
            },
            "regions": ["US", "CA"]
          },
          {
            "id": "ship_express",
            "name": "Express Shipping",
            "price": 1500,
            "currency": "USD",
            "delivery_estimate": {
              "minimum": {"unit": "business_day", "value": 1},
              "maximum": {"unit": "business_day", "value": 2}
            },
            "regions": ["US"]
          }
        ],
        "free_shipping_threshold": 5000
      },
      "pickup": {
        "available": true,
        "locations": [
          {
            "id": "store_nyc_001",
            "name": "NYC Flagship Store",
            "address": {
              "street_address": "123 Fifth Avenue",
              "address_locality": "New York",
              "address_region": "NY",
              "postal_code": "10001",
              "address_country": "US"
            },
            "stock": 5
          }
        ]
      }
    },
    "discounts": {
      "eligible": true,
      "automatic_discounts": [
        {
          "id": "disc_first_order",
          "title": "First Order - 10% Off",
          "type": "percentage",
          "value": 10,
          "conditions": {"first_order": true}
        }
      ],
      "promo_codes": [
        {
          "id": "code_summer2025",
          "code": "SUMMER25",
          "title": "Summer Sale - $25 Off",
          "type": "fixed_amount",
          "value": 2500,
          "minimum_spend": 20000
        }
      ]
    },
    "taxonomies": {
      "schema_org": {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": "Monos Carry-On Pro Suitcase - Black",
        "brand": {"@type": "Brand", "name": "Monos"},
        "offers": {
          "@type": "Offer",
          "price": "265.50",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock"
        }
      },
      "google_merchant": {
        "google_product_category": "Home & Garden > Luggage & Bags > Suitcases",
        "condition": "new",
        "adult": false
      }
    },
    "reviews": {
      "aggregate_rating": {
        "rating_value": 4.8,
        "review_count": 324,
        "best_rating": 5,
        "worst_rating": 1
      },
      "featured_reviews": [
        {
          "id": "review_001",
          "author": "Sarah M.",
          "rating": 5,
          "title": "Perfect for business travel",
          "content": "Fits in all overhead bins, very durable"
        }
      ]
    },
    "policies": {
      "returns": {
        "allowed": true,
        "period_days": 30,
        "condition": "unused with tags",
        "shipping_cost": "free"
      },
      "warranty": {
        "period": "10 years",
        "coverage": "manufacturer defects"
      }
    },
    "metadata": {
      "created_at": "2025-01-01T10:00:00Z",
      "updated_at": "2026-01-15T14:30:00Z",
      "visibility": "published",
      "tags_internal": ["best_seller", "feature_q1_2026"],
      "data_quality_score": 0.97
    }
  },
  "capabilities": {
    "checkout": {
      "supported": true,
      "endpoint": "https://api.example.com/ucp/v1/checkout"
    },
    "negotiation": {
      "supported": true,
      "features": ["discount_application", "shipping_selection"]
    },
    "agent_actions": [
      {
        "type": "AddToCart",
        "target": "https://api.example.com/ucp/v1/cart",
        "actionPlatform": "https://ucp.dev/AgentPlatform"
      },
      {
        "type": "BuyAction",
        "target": "https://api.example.com/ucp/v1/checkout",
        "actionPlatform": "https://ucp.dev/AgentPlatform"
      }
    ]
  }
}
```
