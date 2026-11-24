# Requirements (Task 0.2)

Source of truth for what the platform must do and how well it must do it. IDs are used for traceability into modules (0.4), architecture (0.5), API contracts (0.7) and tests (Phase 12).

## Priority Scale

| Priority | Meaning |
| --- | --- |
| P0 | Required for the first usable release; blocks release if missing |
| P1 | Important for a complete storefront experience; schedule early |
| P2 | Valuable but deferrable; implement when its enabling infrastructure is justified |

## Functional Requirements

### Authentication and Users

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-AUTH-01 | A visitor can register with email and password; passwords are hashed before storage. | P0 |
| FR-AUTH-02 | A registered user can sign in and sign out using a secure, server-managed session. | P0 |
| FR-AUTH-03 | Email addresses are unique and normalized (lowercase/trim). | P0 |
| FR-AUTH-04 | A user must verify their email before accessing order history. | P1 |
| FR-AUTH-05 | A user can request a password-reset link; tokens are single-use and expire. | P0 |
| FR-AUTH-06 | Roles and permissions are enforced server-side on every protected operation. | P0 |
| FR-AUTH-07 | A user can view and update their own profile and manage saved addresses. | P0 |

### Catalog and Search

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CAT-01 | Admin can create, edit, archive and reorder hierarchical categories. | P0 |
| FR-CAT-02 | Admin can create, edit and archive products with descriptions, images and status. | P0 |
| FR-CAT-03 | A product has one or more variants (size/colour etc.) with unique SKU and price. | P0 |
| FR-CAT-04 | Storefront users can browse products by category with cursor pagination. | P0 |
| FR-CAT-05 | Users can filter by category, price range, availability, rating and attributes. | P1 |
| FR-CAT-06 | Users can sort by relevance, price, newest and rating. | P1 |
| FR-CAT-07 | Users can search by name, SKU, brand and description; admin can search too. | P1 |
| FR-CAT-08 | Public product pages expose only ACTIVE products and ACTIVE variants. | P0 |

### Inventory

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-INV-01 | Every variant has an inventory record with available and reserved quantities. | P0 |
| FR-INV-02 | Stock can be adjusted by admin with an auditable reason. | P0 |
| FR-INV-03 | Checkout reserves stock for a bounded TTL and releases it on expiry or failure. | P0 |
| FR-INV-04 | Concurrent checkouts cannot oversell a variant. | P0 |
| FR-INV-05 | Every stock change creates a stock-movement record. | P1 |
| FR-INV-06 | Admin is notified when a variant falls below its low-stock threshold. | P2 |

### Cart and Wishlist

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CART-01 | Guest can add, update, remove and view cart items without an account. | P0 |
| FR-CART-02 | Cart quantities are validated against available stock. | P0 |
| FR-CART-03 | Cart totals (subtotal, discount, tax, shipping, grand total) are computed server-side. | P0 |
| FR-CART-04 | On login or registration, the guest cart merges into the user cart. | P0 |
| FR-CART-05 | Authenticated user can save/remove variants in a wishlist. | P1 |
| FR-CART-06 | A stale guest cart expires and cannot be used to reserve stock indefinitely. | P1 |

### Checkout, Coupons and Payments

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CHK-01 | Authenticated user can save multiple shipping/billing addresses and choose one at checkout. | P0 |
| FR-CHK-02 | Checkout validates cart, stock, prices and address before creating an order. | P0 |
| FR-CHK-03 | Prices, discounts, tax and shipping are recalculated server-side; client values are never trusted. | P0 |
| FR-CHK-04 | A coupon code is validated for active status, validity window, minimum subtotal, usage limit and applicability. | P0 |
| FR-CHK-05 | Admin can create, update and disable percentage or fixed-amount coupons. | P1 |
| FR-CHK-06 | Checkout creates a Razorpay order and redirects to hosted checkout. | P0 |
| FR-CHK-07 | Payment success is verified server-side using Razorpay signature verification. | P0 |
| FR-CHK-08 | Razorpay webhooks are signature-verified and processed idempotently. | P0 |
| FR-CHK-09 | Failed, expired and duplicate payment attempts are handled without duplicate orders or charges. | P0 |
| FR-CHK-10 | Refunds can be initiated by admin and reconciled with inventory and order state. | P1 |

### Orders

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-ORD-01 | A successful checkout creates an order with immutable item snapshots (name, SKU, unit price). | P0 |
| FR-ORD-02 | Order status follows a defined state machine: PENDING_PAYMENT -> PAID -> PROCESSING -> SHIPPED -> DELIVERED, with CANCELLED/REFUNDED terminal paths. | P0 |
| FR-ORD-03 | Customer can view their own order history and order detail. | P0 |
| FR-ORD-04 | Admin can view all orders and transition statuses; invalid transitions are rejected. | P0 |
| FR-ORD-05 | Customer can cancel an order only in allowed states, with stock released. | P1 |
| FR-ORD-06 | Order history is paginated and filterable by status and date. | P1 |

### Reviews and Notifications

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-REV-01 | A verified purchaser can submit one review per product with a 1–5 rating. | P1 |
| FR-REV-02 | Reviews are moderated (PENDING -> APPROVED/REJECTED) before public display. | P1 |
| FR-REV-03 | Product pages display approved reviews and aggregated rating. | P1 |
| FR-NOT-01 | System sends email for registration/verification, password reset, order confirmation, payment failure and refund. | P1 |
| FR-NOT-02 | Notification delivery attempts are recorded with status for debugging and retry. | P1 |

### Admin and Analytics

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-ADM-01 | Admin dashboard provides KPIs: revenue, orders, average order value, conversion, low stock. | P1 |
| FR-ADM-02 | Admin can manage products, categories, inventory, orders, customers, coupons and reviews. | P0 |
| FR-ADM-03 | Admin can export sales reports for a date range. | P2 |
| FR-ANA-01 | System records the events needed for funnel and sales analytics. | P2 |

## Non-Functional Requirements

| ID | Category | Requirement | Target |
| --- | --- | --- | --- |
| NFR-PERF-01 | Performance | Catalog list/detail response time (server, warm cache) | p95 < 200 ms |
| NFR-PERF-02 | Performance | Checkout and payment verification response time | p95 < 800 ms excluding Razorpay round trip |
| NFR-PERF-03 | Performance | First Contentful Paint on storefront pages | p75 < 2.0 s on 4G |
| NFR-PERF-04 | Performance | No unbounded queries; every list endpoint paginated | 100% of list endpoints |
| NFR-SCAL-01 | Scalability | Application instances stateless; scaling out requires no session affinity | Verified in Task 11.8 |
| NFR-SCAL-02 | Scalability | Initial capacity target | 1,000 concurrent users, 10k SKUs |
| NFR-AVAIL-01 | Availability | Monthly availability target | 99.9% |
| NFR-SEC-01 | Security | Passwords hashed with a memory-hard algorithm (Argon2id preferred; bcrypt fallback) | 100% of stored passwords |
| NFR-SEC-02 | Security | Secrets only in environment variables; never logged or committed | 0 leaks |
| NFR-SEC-03 | Security | All protected operations authorized in the service layer | 100% coverage |
| NFR-SEC-04 | Security | Payment webhook signatures verified before processing | 100% of webhooks |
| NFR-SEC-05 | Security | No card data stored; Razorpay hosted checkout keeps PCI scope out of the app | Enforced |
| NFR-SEC-06 | Security | Validation on all external input via Zod | 100% of routes/actions |
| NFR-INT-01 | Integrity | Money writes are transactional and idempotent | 0 duplicate charges/orders |
| NFR-INT-02 | Integrity | Stock updates use conditional writes inside transactions | 0 oversells |
| NFR-MAIN-01 | Maintainability | Business logic lives in services, not UI/route handlers | Enforced by review |
| NFR-MAIN-02 | Maintainability | Unit/integration coverage on service layer | >= 70% |
| NFR-OBS-01 | Observability | Structured logs with request/correlation ID on every request | 100% |
| NFR-OBS-02 | Observability | Errors reported to an error tracker; alerts on payment/webhook failure | P1 |
| NFR-A11Y-01 | Accessibility | Storefront and admin meet WCAG 2.1 AA for core flows | P1 |
| NFR-SEO-01 | SEO | Product/category pages server-rendered with metadata and canonical URLs | P0 |
| NFR-COMP-01 | Compatibility | Desktop and mobile browsers; modern evergreen versions | P0 |
| NFR-TEST-01 | Testability | P0 flows covered by API integration tests and critical flows by Playwright | P1 |

## Constraints

- Single codebase and PostgreSQL database for v1; no service mesh, message broker or Kubernetes.
- Next.js App Router, strict TypeScript, Prisma, Zod, Auth.js, Razorpay are fixed by the brief.
- Money represented as integer minor units (paise) across DB, services and API to avoid floating-point drift; formatting happens at the UI edge.
- Email delivery and image storage providers are not selected yet (decisions in Tasks 3.5 and 4.4).

## Out of Scope for V1

Multi-vendor marketplaces, subscriptions, physical shipping label generation, tax filing integrations, loyalty points, live chat, AR/VR product previews, multi-currency pricing, and mobile native apps. These are not contradicted by the architecture; they are simply not funded requirements today.
