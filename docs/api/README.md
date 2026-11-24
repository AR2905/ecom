# API Endpoints and Contracts (Task 0.7)

## Conventions

- Base path: `/api`. JSON only; `Content-Type: application/json`.
- Field naming: `camelCase`. Timestamps: RFC 3339 UTC strings. IDs: UUID strings.
- Money: integer **minor units** (paise). `49900` means ₹499.00. No floats in requests or responses.
- Auth: Auth.js session cookie. Guest cart identity: httpOnly `cart_token` cookie set by the server; clients never send a user ID.
- All request bodies and query strings are validated with Zod schemas stored in each module's `schemas/` folder.
- List endpoints use cursor pagination; no unbounded responses.
- Mutating endpoints that create money or orders require `Idempotency-Key` (UUID).
- Errors never include stack traces or raw gateway payloads.

## Response Envelope

Success:

```json
{ "data": { "...": "..." }, "meta": { "requestId": "uuid" } }
```

List success adds pagination meta:

```json
{
  "data": [ ],
  "meta": { "nextCursor": "opaque|null", "hasMore": false, "requestId": "uuid" }
}
```

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [{ "path": "quantity", "message": "Must be at least 1" }],
    "requestId": "uuid"
  }
}
```

| HTTP | `code` | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Zod validation failed |
| 401 | `UNAUTHENTICATED` | No/invalid session |
| 403 | `FORBIDDEN` | Missing permission or ownership |
| 404 | `NOT_FOUND` | Resource absent or hidden from caller |
| 409 | `CONFLICT` | Duplicate slug/SKU/email, invalid state transition |
| 409 | `OUT_OF_STOCK` | Requested quantity unavailable |
| 409 | `EXPIRED` | Token, reservation or coupon window expired |
| 422 | `BUSINESS_RULE` | Valid input but rule violated (e.g. coupon minimum) |
| 429 | `RATE_LIMITED` | Too many requests; `Retry-After` header present |
| 500 | `INTERNAL_ERROR` | Unexpected; logged with request ID |

## Endpoint Inventory

### Auth and Users

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | guest | Create account, empty cart, verification email |
| POST | `/api/auth/login` | guest | Verify credentials, create session |
| POST | `/api/auth/logout` | session | Revoke session |
| GET | `/api/auth/session` | guest | Current session/actor context |
| POST | `/api/auth/verify-email` | guest | Consume verification token |
| POST | `/api/auth/password-reset/request` | guest | Issue reset token (always 202) |
| POST | `/api/auth/password-reset/confirm` | guest | Set new password from single-use token |
| GET | `/api/me` | customer+ | Own profile |
| PATCH | `/api/me` | customer+ | Update own profile (role not accepted) |
| GET | `/api/me/addresses` | customer+ | Own addresses |
| POST | `/api/me/addresses` | customer+ | Create address |
| PATCH | `/api/me/addresses/:id` | owner | Update address |
| DELETE | `/api/me/addresses/:id` | owner | Delete address |

### Catalog

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/categories` | guest | Category tree |
| POST | `/api/categories` | `category:create` | Create category |
| PATCH | `/api/categories/:id` | `category:update` | Update category |
| DELETE | `/api/categories/:id` | `category:update` | Archive category |
| GET | `/api/products` | guest | Active product list with filters/sort/pagination |
| GET | `/api/products/:slug` | guest | Product detail with active variants/images |
| POST | `/api/products` | `product:create` | Create product |
| PATCH | `/api/products/:id` | `product:update` | Update product |
| DELETE | `/api/products/:id` | `product:update` | Archive product |
| POST | `/api/products/:id/images` | `product:update` | Attach image metadata |
| POST | `/api/products/:id/variants` | `product:update` | Add variant |
| PATCH | `/api/variants/:id` | `product:update` | Update variant |
| GET | `/api/search` | guest | Cross-category search with facets |

### Cart, Wishlist, Inventory

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/cart` | guest + token | Cart with server-computed totals |
| POST | `/api/cart/items` | guest + token | Add item (merge on duplicate) |
| PATCH | `/api/cart/items/:itemId` | guest + token | Update quantity |
| DELETE | `/api/cart/items/:itemId` | guest + token | Remove item |
| DELETE | `/api/cart` | guest + token | Clear cart |
| GET | `/api/wishlist` | customer+ | Saved variants |
| POST | `/api/wishlist/items` | customer+ | Save variant |
| DELETE | `/api/wishlist/items/:variantId` | customer+ | Remove variant |
| GET | `/api/admin/inventory` | `inventory:read` | Stock table with filters |
| PATCH | `/api/admin/inventory/:variantId` | `inventory:adjust` | Adjust stock with reason |
| GET | `/api/admin/inventory/movements` | `inventory:read` | Stock movement history |

### Checkout, Coupons, Payments, Orders

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/coupons/validate` | guest/customer | Validate code against current cart subtotal |
| GET | `/api/admin/coupons` | `coupon:read` | Coupon list |
| POST | `/api/admin/coupons` | `coupon:create` | Create coupon |
| PATCH | `/api/admin/coupons/:id` | `coupon:update` | Update/disable coupon |
| POST | `/api/checkout` | guest/customer + idempotency key | Validate, reserve, create order + Razorpay order |
| GET | `/api/checkout/:id` | owner | Checkout state (for polling after return) |
| POST | `/api/payments/verify` | guest + idempotency key | Verify callback signature, confirm order |
| POST | `/api/payments/:id/refund` | `payment:refund` | Initiate refund |
| POST | `/api/webhooks/razorpay` | HMAC signature | Process gateway events idempotently |
| GET | `/api/orders` | customer+ (admin: any) | Paginated order history |
| GET | `/api/orders/:id` | owner/admin | Order detail with items/payment |
| POST | `/api/orders/:id/cancel` | owner/admin | Cancel in allowed states |
| PATCH | `/api/admin/orders/:id/status` | `order:transition` | State machine transition |

### Reviews, Notifications, Admin

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/products/:slug/reviews` | guest | Approved reviews + rating summary |
| POST | `/api/reviews` | customer + verified purchase | Submit review |
| PATCH | `/api/admin/reviews/:id/moderate` | `review:moderate` | Approve/reject |
| GET | `/api/me/notifications` | customer+ | Own notifications |
| POST | `/api/admin/notifications/:id/retry` | `notification:send` | Retry failed delivery |
| GET | `/api/admin/dashboard` | `analytics:read` | KPI summary |
| GET | `/api/admin/customers` | `user:read` | Customer list |
| GET | `/api/admin/reports/sales` | `analytics:read` | Sales report export |

## Detailed Contracts

### `POST /api/auth/register`

```ts
const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12).max(128)
});
```

`201` returns `{ data: { userId, email, verificationSent: true } }`. Duplicate email returns `409 CONFLICT`.

### `GET /api/products`

Query schema:

```ts
const productQuerySchema = z.object({
  category: z.string().slug().optional(),
  q: z.string().min(1).max(100).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(), // minor units
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  inStock: z.coerce.boolean().optional(),
  sort: z.enum(['relevance', 'price_asc', 'price_desc', 'newest', 'rating']).default('relevance'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24)
});
```

Each item: `{ id, slug, name, brand, basePrice, compareAtPrice, currency, primaryImageUrl, ratingAvg, reviewCount, available }`. Only `ACTIVE` products/variants are returned.

### `POST /api/cart/items`

```ts
const addCartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99)
});
```

`200` returns the full cart DTO. If available stock is less than requested, `409 OUT_OF_STOCK` with `{ available }` in `details`.

Cart DTO:

```json
{
  "data": {
    "id": "uuid",
    "items": [{ "id": "uuid", "variantId": "uuid", "name": "...", "unitPrice": 49900, "quantity": 2, "lineTotal": 99800, "available": 5 }],
    "totals": { "subtotal": 99800, "discountAmount": 0, "taxAmount": 8982, "shippingAmount": 0, "grandTotal": 108782, "currency": "INR" }
  }
}
```

### `POST /api/checkout`

Headers: `Idempotency-Key: <uuid>` (required).

```ts
const checkoutSchema = z.object({
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid().optional(),
  couponCode: z.string().min(3).max(32).optional(),
  notes: z.string().max(500).optional()
});
```

`201` returns `{ data: { checkoutId, orderId, razorpayOrderId, amount, currency, expiresAt } }`.

Rules:
- Totals are recomputed from DB prices; no client price fields exist in the schema.
- Stock is reserved for 15 minutes; expiry releases the reservation.
- Repeated key with identical body returns the original response; same key with different body returns `409 BUSINESS_RULE`.

### `POST /api/payments/verify`

```ts
const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().length(64)
});
```

The server recomputes HMAC-SHA256 over `orderId|paymentId` using `RAZORPAY_KEY_SECRET`. Mismatch returns `422 BUSINESS_RULE`. Success returns the order summary and marks the payment captured exactly once.

### `POST /api/webhooks/razorpay`

- Reads the **raw body** and verifies `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`.
- Events handled: `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
- Always returns `200` for verified events, including duplicates, so Razorpay does not retry forever.
- Unverified signature returns `401 UNAUTHENTICATED` and is logged without payload data.

### `GET /api/orders`

Query: `status`, `from`, `to` (RFC 3339), `cursor`, `limit` (1–50, default 20). Admin may pass `userId`; customers are always scoped to their own ID by the repository.

### `POST /api/reviews`

```ts
const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().min(3).max(120),
  body: z.string().min(10).max(2000)
});
```

`201` returns a `PENDING` review. Duplicate `(productId, userId)` or missing verified purchase returns `422 BUSINESS_RULE`.

## Pagination and Sorting

- Cursor is opaque to clients (base64 of sort key + ID). Do not use OFFSET for deep pages.
- `limit` is capped per endpoint; invalid cursors return `400 VALIDATION_ERROR`.
- Filters are combined with AND; prices are minor-unit integers.

## Rate Limits

| Scope | Limit |
| --- | --- |
| Auth register/login/password reset | 10 requests / IP / 15 min |
| Coupon validate / checkout | 30 requests / user or guest token / min |
| Public catalog | 300 requests / IP / min |
| Webhooks | Signature verified before any limit; gateway IP range trusted |

## Idempotency Semantics

1. Find `IdempotencyKey` by `(scope, key)`; if `COMPLETE`, return stored response.
2. If `PROCESSING`, return `409 CONFLICT` (concurrent duplicate).
3. Hash the request body; mismatch with stored hash returns `409 BUSINESS_RULE`.
4. Insert key as `PROCESSING`, run the operation in a transaction, store response and mark `COMPLETE`.
5. Expired keys are cleaned by a scheduled job (Phase 11).
