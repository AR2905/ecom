# Database ER Design (Task 0.6)

This is the logical design that Task 2.3 will translate into `prisma/schema.prisma`. Money is stored as **integer minor units** (paise); timestamps are UTC. IDs are UUIDs except where noted.

## Identity and Users

```mermaid
erDiagram
    USER ||--o{ ADDRESS : has
    USER ||--o{ ACCOUNT : links
    USER ||--o{ SESSION : has
    USER ||--o{ VERIFICATION_TOKEN : requests
    USER ||--o{ CART : owns
    USER ||--o{ WISHLIST : owns
    USER ||--o{ ORDER : places
    USER ||--o{ REVIEW : writes
    USER ||--o{ COUPON_REDEMPTION : redeems
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : acts
    USER {
        uuid id PK
        string email UK
        string name
        string passwordHash
        string role
        datetime emailVerifiedAt
        datetime createdAt
        datetime updatedAt
    }
    ADDRESS {
        uuid id PK
        uuid userId FK
        string label
        string line1
        string line2
        string city
        string state
        string postalCode
        string country
        string phone
        boolean isDefault
    }
    ACCOUNT {
        string id PK
        uuid userId FK
        string provider
        string providerAccountId
        string refreshToken
        string accessToken
        datetime expiresAt
        string tokenType
        string scope
        string idToken
    }
    SESSION {
        string id PK
        string sessionToken UK
        uuid userId FK
        datetime expires
    }
    VERIFICATION_TOKEN {
        string identifier
        string token UK
        datetime expires
    }
```

## Catalog and Inventory

```mermaid
erDiagram
    CATEGORY ||--o{ CATEGORY : parent_of
    CATEGORY ||--o{ PRODUCT : contains
    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ PRODUCT_VARIANT : has
    PRODUCT_VARIANT ||--o{ INVENTORY_ITEM : tracks
    INVENTORY_ITEM ||--o{ STOCK_MOVEMENT : records
    INVENTORY_ITEM ||--o{ STOCK_RESERVATION : reserves
    CATEGORY {
        uuid id PK
        uuid parentId FK
        string slug UK
        string name
        string description
        string imageUrl
        boolean isActive
        int position
    }
    PRODUCT {
        uuid id PK
        uuid categoryId FK
        string slug UK
        string name
        string description
        string shortDescription
        string brand
        string status
        boolean isFeatured
        int basePrice
        int compareAtPrice
        string currency
        int ratingAvg
        int reviewCount
    }
    PRODUCT_IMAGE {
        uuid id PK
        uuid productId FK
        string url
        string alt
        int position
        boolean isPrimary
    }
    PRODUCT_VARIANT {
        uuid id PK
        uuid productId FK
        string sku UK
        string name
        jsonb options
        int price
        int compareAtPrice
        string imageUrl
        boolean isActive
    }
    INVENTORY_ITEM {
        uuid id PK
        uuid variantId FK
        int quantityAvailable
        int quantityReserved
        int lowStockThreshold
    }
    STOCK_MOVEMENT {
        uuid id PK
        uuid inventoryItemId FK
        string type
        int quantity
        string reason
        string referenceId
        datetime createdAt
    }
    STOCK_RESERVATION {
        uuid id PK
        uuid inventoryItemId FK
        uuid cartId
        uuid orderId
        int quantity
        datetime expiresAt
        string status
    }
```

`ratingAvg` is stored as an integer out of 100 (e.g. 4.5 -> 450) to avoid float drift; rendered as `ratingAvg / 100` at the UI edge.

## Commerce and Engagement

```mermaid
erDiagram
    CART ||--o{ CART_ITEM : contains
    PRODUCT_VARIANT ||--o{ CART_ITEM : referenced_by
    WISHLIST ||--o{ WISHLIST_ITEM : contains
    PRODUCT_VARIANT ||--o{ WISHLIST_ITEM : referenced_by
    ORDER ||--o{ ORDER_ITEM : contains
    PRODUCT_VARIANT ||--o{ ORDER_ITEM : ordered_as
    ORDER ||--o{ PAYMENT : paid_by
    PAYMENT ||--o{ REFUND : refunded_by
    COUPON ||--o{ COUPON_REDEMPTION : redeemed_in
    ORDER ||--o{ COUPON_REDEMPTION : uses
    PRODUCT ||--o{ REVIEW : reviewed
    CART {
        uuid id PK
        uuid userId FK
        string guestToken UK
        string status
        datetime expiresAt
    }
    CART_ITEM {
        uuid id PK
        uuid cartId FK
        uuid variantId FK
        int quantity
    }
    WISHLIST {
        uuid id PK
        uuid userId FK
    }
    WISHLIST_ITEM {
        uuid id PK
        uuid wishlistId FK
        uuid variantId FK
    }
    COUPON {
        uuid id PK
        string code UK
        string type
        int value
        int minSubtotal
        int maxDiscount
        int usageLimit
        int usedCount
        datetime startsAt
        datetime endsAt
        boolean isActive
    }
    COUPON_REDEMPTION {
        uuid id PK
        uuid couponId FK
        uuid userId FK
        uuid orderId FK
        int discountAmount
    }
    ORDER {
        uuid id PK
        string orderNumber UK
        uuid userId FK
        jsonb addressSnapshot
        string status
        int subtotal
        int discountAmount
        int taxAmount
        int shippingAmount
        int totalAmount
        string currency
        string couponCode
        datetime placedAt
    }
    ORDER_ITEM {
        uuid id PK
        uuid orderId FK
        uuid variantId FK
        string productName
        string variantName
        string sku
        int unitPrice
        int quantity
        int lineTotal
        string imageUrl
    }
    PAYMENT {
        uuid id PK
        uuid orderId FK
        string razorpayOrderId UK
        string razorpayPaymentId UK
        datetime signatureVerifiedAt
        int amount
        string status
        int attempts
    }
    REFUND {
        uuid id PK
        uuid paymentId FK
        uuid orderId FK
        string razorpayRefundId UK
        int amount
        string reason
        string status
    }
    REVIEW {
        uuid id PK
        uuid productId FK
        uuid userId FK
        uuid orderItemId FK
        int rating
        string title
        string body
        string status
        boolean verifiedPurchase
    }
```

## Infrastructure Tables

```mermaid
erDiagram
    NOTIFICATION {
        uuid id PK
        uuid userId FK
        string type
        string channel
        string subject
        string body
        string status
        datetime sentAt
    }
    WEBHOOK_EVENT {
        uuid id PK
        string provider
        string eventId
        string eventType
        jsonb payload
        datetime processedAt
    }
    IDEMPOTENCY_KEY {
        uuid id PK
        string key UK
        string scope
        string requestHash
        jsonb response
        string status
        datetime expiresAt
    }
    AUDIT_LOG {
        uuid id PK
        uuid actorUserId FK
        string action
        string entityType
        string entityId
        jsonb beforeData
        jsonb afterData
        string ip
        string userAgent
    }
    ANALYTICS_EVENT {
        uuid id PK
        string name
        uuid userId
        uuid orderId
        string sessionId
        jsonb properties
        datetime occurredAt
    }
```

## Constraints

| Table | Constraint | Reason |
| --- | --- | --- |
| `User` | `email` unique, case-insensitive normalized | One account per email |
| `Account` | unique `(provider, providerAccountId)` | One OAuth identity per provider |
| `VerificationToken` | unique `(identifier, token)`; expiry checked in service | Single-use tokens |
| `Category` | `parentId` self FK with cycle prevention in service | Tree integrity |
| `Product` / `ProductVariant` | unique `slug` / unique `sku` | Stable public URLs and fulfillment identity |
| `InventoryItem` | `quantityAvailable >= 0`, `quantityReserved >= 0` | No negative stock |
| `CartItem` | unique `(cartId, variantId)` | Quantity merged on repeat add |
| `WishlistItem` | unique `(wishlistId, variantId)` | No duplicate saved items |
| `User.address` | at most one `isDefault` per user (partial unique index) | Deterministic default address |
| `CouponRedemption` | unique `(couponId, orderId)` | Coupon used once per order |
| `Coupon` | `usageLimit >= usedCount` enforced in transaction | No over-redemption |
| `Order` | `orderNumber` unique | Human-facing identifier |
| `OrderItem` | snapshot columns immutable after creation | Historical price integrity |
| `Payment` | unique `razorpayOrderId`, unique non-null `razorpayPaymentId` | No duplicate gateway records |
| `Refund` | unique `razorpayRefundId` | Idempotent refunds |
| `Review` | unique `(productId, userId)`, `rating` 1–5 | One moderated review per user per product |
| `WebhookEvent` | unique `(provider, eventId)` | Webhook deduplication |
| `IdempotencyKey` | unique `key` within scope | Duplicate request protection |

## Indexes

| Table | Index | Supports |
| --- | --- | --- |
| `Product` | `(status, categoryId, createdAt DESC)` | Public listing by category |
| `Product` | `slug` (unique) | Detail page lookup |
| `Product` | `isFeatured, status` partial | Home page featured products |
| `ProductVariant` | `sku` (unique), `(productId, isActive)` | SKU lookup and detail variants |
| `Category` | `slug` (unique), `(parentId, position)` | Tree and URL lookup |
| `InventoryItem` | `(quantityAvailable)` where below threshold partial | Low-stock alerts |
| `Cart` | `(userId, status)`, `guestToken` (unique) | Fast cart lookup |
| `Wishlist` | `userId` (unique) | User wishlist |
| `Order` | `(userId, placedAt DESC)`, `(status, placedAt DESC)` | Order history and admin queue |
| `OrderItem` | `orderId` | Order detail |
| `Payment` | `razorpayOrderId` (unique), `orderId` | Verification and order lookup |
| `Coupon` | `code` (unique), `(isActive, endsAt)` | Validation queries |
| `Review` | `(productId, status)` | Approved review list |
| `Notification` | `(userId, createdAt DESC)` | Notification list |
| `WebhookEvent` | `(provider, eventId)` (unique) | Dedupe |
| `IdempotencyKey` | `key` (unique), `expiresAt` | Idempotency and cleanup |
| `StockReservation` | `(status, expiresAt)` | Expiry sweeper |
| `AnalyticsEvent` | `(name, occurredAt DESC)`, `(userId, occurredAt DESC)` | Reports |

## Deletion Policy

- Soft-delete via `status = ARCHIVED` for products/categories; hard delete only for expired carts, tokens and old idempotency keys.
- Foreign keys use `Restrict` for order/payment/review history and `Cascade` for dependent child rows such as cart items and images.
