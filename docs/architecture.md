# System Architecture (Task 0.5)

## Drivers

The design is driven by the non-functional requirements in `docs/requirements.md`: maintainability with module extraction in mind, correct money and stock under concurrency, fast cached catalog reads, and stateless horizontal scaling.

## Context

```mermaid
flowchart LR
    CUSTOMER[Customer / Guest] --> APP[E-commerce Application]
    ADMIN[Store Admin] --> APP
    APP --> PG[(PostgreSQL)]
    APP --> REDIS[(Redis cache)]
    APP --> STORAGE[(Object storage)]
    APP --> RZ[Razorpay]
    APP --> MAIL[Email provider]
```

## Container View

| Container | Technology | Responsibility | Scales by |
| --- | --- | --- | --- |
| Web/API application | Next.js App Router, Server Components, Route Handlers, Server Actions | Render UI, validate input, orchestrate services | More stateless instances behind load balancer |
| Primary database | PostgreSQL | System of record, transactions, constraints | Vertical first, read replicas later |
| Cache | Redis | Catalog fragments, rate-limit counters, reservation TTLs, idempotency guard | Cluster later |
| Object storage | S3-compatible | Product images | Provider-managed |
| Payment gateway | Razorpay hosted checkout + webhooks | Card processing, refunds | Provider-managed |
| Email provider | SMTP/API (selected in Task 3.5) | Transactional email | Provider-managed |

## Component View (inside the application)

```mermaid
flowchart TD
    UI[Server Components / Client Components] --> TRANSPORT[Route Handlers + Server Actions]
    TRANSPORT --> VALIDATION[Zod schemas]
    VALIDATION --> FACADES[Module service facades]
    FACADES --> SERVICES[Business services + transactions]
    SERVICES --> REPOS[Repositories]
    REPOS --> PRISMA[Prisma Client]
    SERVICES --> CACHE[Cache abstraction]
    SERVICES --> EVENTS[In-process event dispatcher]
    EVENTS --> NOTIF[notifications facade]
    EVENTS --> ANALYTICS[analytics facade]
```

**Why this shape:** route handlers stay thin (parse + validate + call service + map errors). Business rules are callable from both HTTP and Server Actions, so there is one implementation of each rule. Repositories are the only place with Prisma queries, enabling query optimization and test doubles.

## Request Lifecycle

1. Edge/CDN serves static assets and cached public pages.
2. Next.js resolves the route; middleware handles correlation ID, rate limit and coarse auth checks.
3. Route Handler/Server Action validates with Zod and builds an `ActorContext` (`userId`, `role`, `guestToken`).
4. Guard checks `resource:action`; service re-checks authorization.
5. Service uses repositories inside a transaction where multiple rows change.
6. Cache is read through with tags; mutations invalidate affected tags and call `revalidateTag`/`revalidatePath`.
7. Errors are mapped to the documented envelope with a request ID; unexpected errors go to the error tracker.

## Key Flows

### Public catalog read (read-optimized)

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Next.js Server Component
    participant C as Redis / Data Cache
    participant P as PostgreSQL
    B->>N: GET /products?category=shoes&cursor=...
    N->>C: get cached page key
    alt cache hit
        C-->>N: product page DTO
    else cache miss
        N->>P: indexed query (ACTIVE only, selected fields, cursor)
        P-->>N: rows
        N->>C: set with tag products:list, TTL 60s
    end
    N-->>B: streamed HTML + RSC payload
```

### Checkout with reservation and payment

```mermaid
sequenceDiagram
    participant U as Customer
    participant CH as CheckoutService
    participant INV as InventoryService
    participant ORD as OrderService
    participant PAY as PaymentService
    participant RZ as Razorpay
    U->>CH: POST /checkout (addressId, idempotency key)
    CH->>INV: reserve(variants, qty, TTL 15 min) in transaction
    INV-->>CH: reservationId
    CH->>ORD: create order PENDING_PAYMENT with item snapshots
    CH->>PAY: create Razorpay order for exact order total
    PAY->>RZ: create order
    RZ-->>PAY: razorpayOrderId
    CH-->>U: checkoutId + orderId + razorpayOrderId
    U->>RZ: hosted checkout payment
    RZ-->>U: redirect with payment id + signature
    U->>PAY: POST /payments/verify
    PAY->>RZ: verify HMAC signature server-side
    PAY->>ORD: mark PAID, commit reservation
    PAY->>NOTIF: order confirmation email event
```

### Webhook (idempotent)

```mermaid
sequenceDiagram
    participant RZ as Razorpay
    participant API as /api/webhooks/razorpay
    participant PAY as PaymentService
    participant DB as PostgreSQL
    RZ->>API: signed event
    API->>API: verify HMAC over raw body
    API->>PAY: handleWebhook(eventId, payload)
    PAY->>DB: INSERT WebhookEvent (unique provider+eventId)
    alt duplicate
        DB-->>PAY: unique violation -> return 200, no side effects
    else new
        PAY->>DB: transaction: update payment/order, commit reservation
        PAY->>DB: mark WebhookEvent processed
    end
    API-->>RZ: 200 OK
```

## Cross-Cutting Concerns

| Concern | Approach |
| --- | --- |
| Validation | Zod schemas shared by route handlers, Server Actions and service boundaries; parse at the edge, trust typed values inside |
| Errors | Typed `AppError` hierarchy (Validation, Unauthorized, Forbidden, NotFound, Conflict, Payment); one error mapper for HTTP |
| Logging | Structured JSON logs, correlation ID from middleware, no secrets or raw card/payment payloads logged |
| Transactions | Prisma `$transaction` for stock, order and payment state changes; no network calls inside DB transactions where avoidable |
| Idempotency | `Idempotency-Key` header with `IdempotencyKey` row; webhook dedupe via `WebhookEvent` uniqueness |
| Caching | Public data cached with tags and TTLs; personalized/cart/checkout data never in shared cache |
| Authorization | Guards at route + service; ownership filters in repositories |
| Observability | Request metrics, error tracking, payment/webhook alerts (Phase 12) |
| Time & money | UTC timestamps; integer minor units for money; Razorpay receives the same integer |

## Architecture Decision Records

| ADR | Decision | Why | Revisit when |
| --- | --- | --- | --- |
| 001 | Modular monolith first, no microservices | One deployable, one transaction boundary; fastest path to a working store with clean extraction seams | Independent scaling/ownership need appears |
| 002 | Prisma + PostgreSQL | Type-safe repositories, migrations, transactions, strong constraints | Query patterns need a specialized store |
| 003 | Auth.js with database sessions | Secure cookies, server-controlled revocation, works across instances | Central identity provider becomes mandatory |
| 004 | Redis as cache, not source of truth | Speed without risking divergent data; all cached data reconstructible from Postgres | Cache hit rate or write patterns justify more |
| 005 | Razorpay hosted checkout | Keeps card data out of PCI scope and reduces compliance burden | Custom checkout UX is contractually required |
| 006 | Service facades between modules | Prevents repository leakage and enables later extraction | Never (rule remains) |
| 007 | Integer minor units for money | Removes floating-point drift and matches Razorpay's amount format | Multi-currency needs dynamic minor-unit rules |

## Deployment View

- One Next.js container image, multiple stateless replicas behind a reverse proxy/load balancer.
- PostgreSQL primary with connection pooling (`PgBouncer` or provider pooler); `DIRECT_URL` reserved for migrations.
- Redis shared by all replicas; no in-process session or cart state.
- Static assets and product images served via CDN.
- Blue/green or rolling deploys; migrations are backward-compatible (expand-then-contract).

## Architectural Risks

| Risk | Mitigation |
| --- | --- |
| Module boundaries erode over time | Facade-only imports; review checklist; no cross-module repository imports |
| Oversell under concurrency | Conditional stock update in transaction + reservation TTL |
| Duplicate payments/orders | Idempotency key + webhook dedupe + DB unique constraints |
| Cache serving stale prices | Prices re-read on checkout; cache tags invalidated on product/coupon update |
| Premature infrastructure | Each new component needs a task with a measured requirement |
| Migrations block rolling deploys | Backward-compatible migrations only, introduced in Task 2.6 |
