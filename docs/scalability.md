# Scalability and Performance Strategy (Task 0.9)

## Performance Budgets

| Path | Budget | Verification |
| --- | --- | --- |
| Catalog list/detail (warm) | p95 < 200 ms server time | Task 12.8 load test |
| Search | p95 < 300 ms | Task 12.8 |
| Cart read/mutation | p95 < 300 ms | Task 12.8 |
| Checkout (excluding gateway) | p95 < 800 ms | Task 12.8 |
| FCP on storefront | p75 < 2.0 s on 4G | Lighthouse in Task 12.8 |
| Largest Contentful Paint | p75 < 2.5 s | Lighthouse |
| API list payload | <= 100 KB per page | Contract tests |
| DB queries per request | <= 10 for catalog/cart paths | Query logging in staging |

Targets are checked before adding infrastructure; most wins come from query shape, indexes and caching.

## Caching Layers

| Layer | What | TTL / invalidation | Notes |
| --- | --- | --- | --- |
| Browser/CDN | Static assets, product images, fully public pages | long `Cache-Control`, immutable hashed assets | Configured in Task 11.2 |
| Next.js Data Cache / ISR | Public category/product pages and catalog fragments | 60 s revalidate + tag invalidation | `revalidateTag('products:list')` on admin edits |
| React `cache()` | Dedupe repeated reads within one server render | request lifetime | Prevents N+1 in nested Server Components |
| Redis | Catalog projections, rate-limit counters, reservation TTLs, idempotency guard | 60–300 s; keysnamespaced by version | Cache-aside; never source of truth |
| PostgreSQL buffer | Hot rows/indexes | DB-managed | Keep working set small via narrow selects |

**Never cached in shared layers:** cart contents, wishlist, orders, addresses, session data, coupon redemption state. Personalized responses are `dynamic = 'force-dynamic'` or fetched with `noStore()`.

**Invalidation rules:** product/category/variant/image change invalidates `products:list`, `products:detail:<slug>`, `categories:tree`; coupon change invalidates `pricing:*`; review approval invalidates `reviews:<productId>` and product rating cache.

## Database Strategy

- **Index first:** every list query uses an index matching its filter + sort (see `docs/database/er-diagram.md`). No `SELECT *` in repositories.
- **Cursor pagination:** keyset pagination with opaque cursors; no OFFSET for deep pages.
- **N+1 avoidance:** explicit `include`/`select` shapes; batched lookups for variant availability; no per-row repository calls in loops.
- **Short transactions:** gather inputs and perform gateway calls before opening the DB transaction; keep the transaction to conditional stock update + order/payment writes + outbox rows.
- **Conditional stock update:** `UPDATE InventoryItem SET quantityAvailable = quantityAvailable - n WHERE id = ? AND quantityAvailable >= n`; zero affected rows means out of stock. This is the oversell guard under concurrency.
- **Reservations:** 15-minute expiry with a `(status, expiresAt)` index and a sweeper; reservations are committed or released exactly once.
- **Connection pooling:** Prisma uses a pooled `DATABASE_URL`; `DIRECT_URL` is only for migrations. Pool size is bounded per instance; `PgBouncer` or provider pooler added when instance count grows.
- **Read replicas:** considered at sustained high read/write ratio; only catalog/report queries may target replicas. Writes always go to primary. Replication lag is acceptable for catalog, not for cart/checkout.
- **Partitioning:** not now; revisit if `AnalyticsEvent` or `AuditLog` exceed tens of millions of rows.
- **Migrations:** backward-compatible expand-then-contract so rolling deploys never break.

## Write Path Correctness at Scale

- All money creation endpoints require `Idempotency-Key`; webhooks dedupe on `(provider, eventId)` unique constraint.
- Order items are immutable snapshots, so catalog edits never rewrite history.
- Status transitions go through one state machine; invalid transitions return `409`.
- Outbox pattern (introduced with BullMQ in Task 11.3/11.4): side effects such as email and analytics are written in the same transaction as the state change, then dispatched asynchronously.

## Statelessness and Horizontal Scaling

- Sessions live in PostgreSQL, carts in PostgreSQL with a signed guest token cookie; no in-memory user state.
- Redis is shared by all instances; no sticky sessions required.
- Product images go to object storage, not the app filesystem.
- Environment-specific config is validated at boot from environment variables.
- Health check endpoint for liveness/readiness; readiness checks database and Redis connectivity.
- Rolling/blue-green deploys; migrations run as a separate pre-deploy step.

## Background Work

Introduce BullMQ only when these conditions are met:

| Work | Trigger |
| --- | --- |
| Email delivery | Any notification send (Task 11.4); retry with backoff |
| Expired reservation sweep | Scheduled every minute |
| Idempotency key cleanup | Scheduled hourly |
| Report generation | Admin export request (Task 10.10) |
| Search indexing | Catalog mutation (only if external search is introduced) |

Jobs must be idempotent and safe to replay.

## CDN and Images

- `next/image` with AVIF/WebP, responsive sizes, lazy loading; priority only for above-the-fold hero images.
- Product images served from object storage through CDN with long immutable cache headers.
- Static pages/images get `Cache-Control: public, max-age=31536000, immutable` where fingerprinted; HTML uses short revalidation.

## Growth Triggers

| Signal | Response |
| --- | --- |
| Catalog p95 > 200 ms despite caching | Add read replica / tune indexes before changing architecture |
| Search relevance or facet needs grow | Introduce dedicated search service (Task 11.10) |
| Email volume causes request latency | Move to BullMQ workers (Task 11.3/11.4) |
| One module needs independent deploy/scale | Extract along facade boundary (e.g. Inventory or Payments) |
| Multiple services must change state atomically | Saga with compensating actions + outbox; never cross-service DB transactions |
| Traffic spikes | Scale app replicas; Redis/Postgres remain shared bottlenecks |

## Observability

- Structured logs with correlation ID on every request; no secrets or payment payloads logged.
- Metrics: request rate, p50/p95/p99, error rate, cache hit ratio, DB pool usage, reservation expiry count, webhook failures.
- Alerts: payment verification failures, webhook processing failures, DB connection saturation, error-rate spike.
- Load tests in Task 12.8 use realistic catalog/cart/checkout mixes and verify these budgets before release.

## Anti-Patterns to Avoid

- Caching personalized or price-sensitive data in shared caches.
- Trusting client-supplied totals or coupon values.
- `OFFSET`-based deep pagination.
- Network calls inside database transactions.
- Introducing a broker or microservice before the module boundary and contract are stable.
