# E-commerce Platform (Next.js)

A production-oriented e-commerce platform built as a **modular monolith** with Next.js App Router. This repository is being built one task at a time; every completed task is documented in [`CURRENT_TASK.md`](./CURRENT_TASK.md).

**Current status:** Phase 1 complete (Tasks 1.1–1.8). Next: Phase 2 — Database & Infrastructure.

## Overview

The platform supports multiple customers, a product catalog with categories and variants, inventory tracking, cart and wishlist, authentication with role-based access control, coupon-based checkout, Razorpay payments, order management, reviews, email notifications, an admin dashboard, search/filter/sort/pagination, and analytics/reporting.

The design goal is to keep one deployable application and one database today, with module boundaries clean enough that a module can be extracted into an independent service later without rewriting its business logic.

## Requirements Understanding (Task 0.1)

This section records the interpreted scope. Formal requirements, roles, modules and design decisions are documented in the links below.

**Business capabilities requested:** catalog + categories + variants, inventory with oversell protection, guest and customer cart, wishlist, auth + RBAC, coupon/discount validation, tax/shipping calculation, Razorpay checkout with server-side verification and webhooks, order lifecycle including refunds, reviews and ratings, email notifications, admin operations, search/filter/sort/pagination, and analytics/reporting.

**Quality attributes requested:** horizontal scalability, high availability, maintainability, high performance, secure session/payment handling, testability, and production-grade deployment.

**Explicit constraints from the brief:** Server Components by default, no business logic in components or route handlers, service + repository layering, Zod validation, Prisma transactions and indexes, strict TypeScript, and infrastructure introduced only when justified.

**Interpretation notes:**
- "Start with a modular monolith" means no microservices, queues, or message broker in early phases — only clear internal boundaries.
- "Multiple customers" implies per-user data isolation for carts, orders, addresses, and wishlists from the first implementation.
- "Production-ready" is treated as a target state verified at the end of each phase, not a claim about the current commit.

**Open questions carried forward:** dedicated git repository inside `ecom` (deferred to Task 1.8), Razorpay test credentials (Phase 7), transactional email provider (Phase 3/11), image storage backend (Task 4.4).

## Phase 0 Documentation

| Task | Document | Contents |
| --- | --- | --- |
| 0.1 | This README + `CURRENT_TASK.md` | Scope interpretation and task tracking |
| 0.2 | [`docs/requirements.md`](./docs/requirements.md) | Functional (FR) and non-functional (NFR) requirements with priorities |
| 0.3 | [`docs/roles-and-permissions.md`](./docs/roles-and-permissions.md) | Roles, `resource:action` matrix, ownership rules, enforcement points |
| 0.4 | [`docs/modules.md`](./docs/modules.md) | 15 modules, dependencies, facades, cross-module workflows, event names |
| 0.5 | [`docs/architecture.md`](./docs/architecture.md) | Context/container/component views, key flows, ADRs, risks |
| 0.6 | [`docs/database/er-diagram.md`](./docs/database/er-diagram.md) | ER diagrams, constraints, indexes, deletion policy |
| 0.7 | [`docs/api/README.md`](./docs/api/README.md) | Endpoint inventory, envelopes, detailed contracts, rate limits |
| 0.8 | [`docs/folder-structure.md`](./docs/folder-structure.md) | Target tree, module anatomy, import rules |
| 0.9 | [`docs/scalability.md`](./docs/scalability.md) | Budgets, caching, DB strategy, scaling triggers, observability |

## Technology Stack

| Layer | Choice |
| --- | --- |
| Application | Next.js 16.4.6 (App Router), React 19.3.0, TypeScript strict |
| Styling / UI | Tailwind CSS, shadcn/ui |
| Validation | Zod |
| Backend | Route Handlers, Server Actions, service layer, repository pattern |
| Database | PostgreSQL + Prisma (migrations, indexes, transactions) |
| Cache / broker | Redis (cache first; BullMQ only when a real requirement exists) |
| Auth | Auth.js with secure sessions and RBAC |
| Client state | Zustand; TanStack Query only for beneficial client server-state |
| Payments | Razorpay with server-side verification, webhooks, idempotency |
| Testing | Vitest, React Testing Library, Playwright |
| DevOps | Docker, Docker Compose, GitHub Actions, structured logging, error tracking |

## Architecture Overview

```
UI (Server Components, minimal Client Components)
  -> Route Handlers / Server Actions   [transport + Zod validation]
    -> Services                        [business rules + transactions]
      -> Repositories                  [data access only]
        -> Prisma -> PostgreSQL
           -> Redis (cache / rate limiting)
           -> External: Razorpay, email provider, object storage
```

**Modules:** auth, users, products, categories, inventory, cart, wishlist, checkout, payments, orders, coupons, reviews, notifications, admin, analytics.

**Boundary rule:** a module imports another module's **service facade**, never its repository or Prisma model types directly. Cross-module workflows (checkout, order creation) are orchestrated in a service using transactions, so they can later become events/commands without changing callers.

**Future extraction:** Auth, Catalog, Inventory, Cart, Order, Payment, Notification and Search are the likely first services. REST for synchronous queries; RabbitMQ/Kafka, sagas, idempotency, retries and circuit breakers only when distributed transactions actually appear. Documented in Task 11.10.

## Proposed Folder Structure

```
ecom/
├── src/
│   ├── app/
│   │   ├── (storefront)/
│   │   ├── (auth)/
│   │   ├── account/
│   │   ├── admin/
│   │   └── api/
│   ├── modules/
│   │   ├── auth/ users/ products/ categories/ inventory/
│   │   ├── cart/ wishlist/ checkout/ payments/ orders/
│   │   ├── coupons/ reviews/ notifications/ admin/ analytics/
│   │   │   └── {components, services, repositories, schemas, types}
│   ├── components/ui/
│   ├── lib/
│   ├── config/
│   └── tests/
├── prisma/
├── docs/
├── README.md
├── CURRENT_TASK.md
└── docker-compose.yml
```

## Setup Instructions

**Implemented (Phase 1):** Next.js 16.4.6 App Router project with TypeScript strict, Tailwind CSS v4, shadcn/ui, ESLint, the planned folder tree, `.env.example`, typed errors, structured logging and Docker Compose for PostgreSQL/Redis.

```bash
npm ci                 # install from package-lock.json
cp .env.example .env   # then fill in local-only values
npm run dev:infra      # start PostgreSQL + Redis containers
npm run dev            # http://localhost:3000
npm run verify         # lint + typecheck + production build
```

**Still planned:** Prisma schema and migrations (Phase 2), application features (Phases 3–10), production Docker image and CI/CD (Phase 12).

## Development Conventions

- Repository: `main` is protected; work happens on short-lived branches.
- Branch naming: `task/<id>-<slug>` (for example `task/1.8-git-conventions`), `fix/<slug>`, `chore/<slug>`.
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.
- Run `npm run verify` (lint + typecheck + build) before opening a pull request.
- Keep one task per pull request; update `README.md` and `CURRENT_TASK.md` before considering a task complete.
- Never commit secrets, `.env.local`, generated build output or real payment/email credentials.
- Business logic belongs in module services; route handlers validate and delegate.
- Prefer Server Components; add `"use client"` only when interactivity is required.

## Environment Variables Reference

Names and purposes only. No real values belong in this repository; `.env.example` is planned in Task 1.5.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection string used by Prisma Client |
| `DIRECT_URL` | Direct PostgreSQL connection used for migrations |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT` | Docker Compose settings for the local PostgreSQL container |
| `REDIS_URL` | Redis connection string for cache and rate limiting |
| `REDIS_PORT` | Host port published by the local Redis container |
| `AUTH_SECRET` | Secret used by Auth.js to sign/encrypt session cookies |
| `AUTH_URL` | Canonical auth base URL for callbacks |
| `NEXT_PUBLIC_APP_URL` | Public application URL used in links and redirects |
| `RAZORPAY_KEY_ID` | Razorpay public key identifier |
| `RAZORPAY_KEY_SECRET` | Razorpay secret for server-side order creation/verification |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for verifying Razorpay webhook signatures |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Transactional email delivery settings |
| `STORAGE_DRIVER`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Product image storage settings (driver decided in Task 4.4) |
| `LOG_LEVEL` | Minimum server log level |
| `SENTRY_DSN` | Optional error tracking endpoint |

## Database Setup

> **Planned.** PostgreSQL via Docker Compose (Task 1.7/2.1), Prisma schema and initial migration (Tasks 2.2–2.6), seed data for local development (Task 2.6). No schema or migration exists yet.

## Development Commands

| Command | Status | Purpose |
| --- | --- | --- |
| `npm run dev` | Available | Development server |
| `npm run build` | Available | Production build |
| `npm run start` | Available | Serve production build |
| `npm run lint` | Available | ESLint (Next.js configs) |
| `npx tsc --noEmit` | Available | TypeScript check (script added in Task 1.2) |
| `npm run typecheck`, `npm run test`, `npm run test:e2e` | Planned | Tasks 1.2 and 12.x |
| `npx prisma studio`, `npx prisma migrate dev` | Planned | Task 2.x |

## API Documentation Location

Endpoint contracts are in [`docs/api/README.md`](./docs/api/README.md). Zod schemas in each module's `schemas/` folder will be the runtime contract source (Task 4 onward).

## Testing Instructions

> **Planned** in Tasks 12.5–12.8: Vitest for unit/integration, React Testing Library for components, Playwright for end-to-end flows, and API integration tests against a test database. No tests exist yet.

## Deployment Instructions

> **Planned** in Tasks 12.9–12.11: production Docker image, environment configuration, GitHub Actions CI/CD, and monitoring/error tracking.

## Scalability Strategy

- Start with a single application/database; optimize queries, add indexes and pagination before adding infrastructure.
- Redis for hot catalog/session/rate-limit data with explicit revalidation; never cache personalized cart data in shared caches.
- Keep write paths transactional and idempotent so they remain safe under horizontal scaling.
- Use background jobs only for slow side effects (email, reports); use the outbox pattern when events must be reliable.
- Extract services along module boundaries when a module has independent scaling, deployment or ownership needs (Task 11.10).

## Development Roadmap

| Phase | Focus | Status |
| --- | --- | --- |
| 0 | Requirement analysis & architecture | Complete |
| 1 | Project foundation | Complete |
| 2 | Database & infrastructure | Not started |
| 3 | Authentication & authorization | Not started |
| 4 | Product catalog | Not started |
| 5 | Inventory management | Not started |
| 6 | Shopping cart & wishlist | Not started |
| 7 | Checkout & payments | Not started |
| 8 | Order management | Not started |
| 9 | Frontend development | Not started |
| 10 | Admin dashboard | Not started |
| 11 | Advanced architecture & scalability | Not started |
| 12 | Security, testing & deployment | Not started |

## Task Completion Checklist

Only checked after implementation, verification and documentation are complete.

### Phase 0 — Requirement Analysis & Architecture
- [x] 0.1 Understand project requirements
- [x] 0.2 Define functional and non-functional requirements
- [x] 0.3 Identify user roles and permissions
- [x] 0.4 Define all application modules
- [x] 0.5 Design system architecture
- [x] 0.6 Design database ER diagram
- [x] 0.7 Define API endpoints and contracts
- [x] 0.8 Define project folder structure
- [x] 0.9 Document scalability and performance strategy

### Phase 1 — Project Foundation
- [x] 1.1 Initialize Next.js project
- [x] 1.2 Configure TypeScript and ESLint
- [x] 1.3 Configure Tailwind and shadcn/ui
- [x] 1.4 Establish folder structure
- [x] 1.5 Configure environment variables
- [x] 1.6 Configure error handling and logging
- [x] 1.7 Configure Docker and local development environment
- [x] 1.8 Set up Git and development conventions

### Phase 2 — Database & Infrastructure
- [ ] 2.1 Configure PostgreSQL
- [ ] 2.2 Configure Prisma
- [ ] 2.3 Design database schema
- [ ] 2.4 Define relationships and constraints
- [ ] 2.5 Add indexes
- [ ] 2.6 Create migrations and seed data
- [ ] 2.7 Configure Redis
- [ ] 2.8 Implement database connection management

### Phase 3 — Authentication & Authorization
- [ ] 3.1 User registration
- [ ] 3.2 Login and logout
- [ ] 3.3 Password hashing
- [ ] 3.4 Session management
- [ ] 3.5 Email verification
- [ ] 3.6 Forgot/reset password
- [ ] 3.7 RBAC
- [ ] 3.8 Route and resource protection

### Phase 4 — Product Catalog
- [ ] 4.1 Category management
- [ ] 4.2 Product schema and management
- [ ] 4.3 Product CRUD APIs
- [ ] 4.4 Product images and storage
- [ ] 4.5 Product variants
- [ ] 4.6 Product listing
- [ ] 4.7 Product details
- [ ] 4.8 Search and filtering
- [ ] 4.9 Sorting and pagination
- [ ] 4.10 Catalog caching

### Phase 5 — Inventory Management
- [ ] 5.1 Inventory schema
- [ ] 5.2 Stock management
- [ ] 5.3 Stock reservation
- [ ] 5.4 Prevent overselling
- [ ] 5.5 Transaction-based stock updates
- [ ] 5.6 Low-stock notifications

### Phase 6 — Shopping Cart & Wishlist
- [ ] 6.1 Cart schema and APIs
- [ ] 6.2 Add/remove cart items
- [ ] 6.3 Update quantities
- [ ] 6.4 Calculate cart totals
- [ ] 6.5 Guest cart support
- [ ] 6.6 Merge guest cart after login
- [ ] 6.7 Wishlist functionality
- [ ] 6.8 Redis cart caching if beneficial

### Phase 7 — Checkout & Payments
- [ ] 7.1 Address management
- [ ] 7.2 Checkout validation
- [ ] 7.3 Price calculation
- [ ] 7.4 Tax and shipping calculation
- [ ] 7.5 Coupon validation
- [ ] 7.6 Order creation workflow
- [ ] 7.7 Razorpay integration
- [ ] 7.8 Payment verification
- [ ] 7.9 Webhook handling
- [ ] 7.10 Idempotent payment processing
- [ ] 7.11 Handle payment failures and retries

### Phase 8 — Order Management
- [ ] 8.1 Order schema
- [ ] 8.2 Order creation
- [ ] 8.3 Order status management
- [ ] 8.4 Customer order history
- [ ] 8.5 Order details
- [ ] 8.6 Cancellation
- [ ] 8.7 Refund workflow
- [ ] 8.8 Inventory reconciliation

### Phase 9 — Frontend Development
- [ ] 9.1 Home page
- [ ] 9.2 Product listing page
- [ ] 9.3 Product details page
- [ ] 9.4 Search results
- [ ] 9.5 Cart page
- [ ] 9.6 Checkout page
- [ ] 9.7 Login and registration pages
- [ ] 9.8 Customer account
- [ ] 9.9 Order history
- [ ] 9.10 Wishlist
- [ ] 9.11 Responsive design and accessibility

### Phase 10 — Admin Dashboard
- [ ] 10.1 Admin layout
- [ ] 10.2 Dashboard analytics
- [ ] 10.3 Product management
- [ ] 10.4 Category management
- [ ] 10.5 Inventory management
- [ ] 10.6 Order management
- [ ] 10.7 Customer management
- [ ] 10.8 Coupon management
- [ ] 10.9 Reviews management
- [ ] 10.10 Sales reports

### Phase 11 — Advanced Architecture & Scalability
- [ ] 11.1 Redis caching strategies
- [ ] 11.2 CDN integration
- [ ] 11.3 Background job processing with BullMQ
- [ ] 11.4 Email notification queues
- [ ] 11.5 Rate limiting
- [ ] 11.6 Database query optimization
- [ ] 11.7 Database connection pooling
- [ ] 11.8 Horizontal scaling considerations
- [ ] 11.9 Event-driven architecture
- [ ] 11.10 Microservice extraction strategy
- [ ] 11.11 Message broker integration where justified
- [ ] 11.12 Distributed tracing and observability

### Phase 12 — Security, Testing & Deployment
- [ ] 12.1 Security audit
- [ ] 12.2 Input validation
- [ ] 12.3 SQL injection and XSS protection
- [ ] 12.4 CSRF and authentication security
- [ ] 12.5 API integration testing
- [ ] 12.6 Unit testing
- [ ] 12.7 E2E testing with Playwright
- [ ] 12.8 Performance testing
- [ ] 12.9 Docker production configuration
- [ ] 12.10 GitHub Actions CI/CD
- [ ] 12.11 Production deployment
- [ ] 12.12 Logging and monitoring
- [ ] 12.13 Final production readiness checklist
