# Project Folder Structure (Task 0.8)

This is the target layout. Task 1.4 will create it; tasks after that place files according to these rules.

## Root

```
ecom/
├── src/                     # all application code
├── prisma/                  # schema.prisma, migrations/, seed.ts
├── docs/                    # architecture, requirements, API contracts, ADRs
├── public/                  # static assets (favicons, logos)
├── tests/                   # cross-cutting e2e + shared test utilities
├── .github/workflows/       # CI/CD (Task 12.10)
├── .env.example             # variable names only (Task 1.5)
├── Dockerfile               # production image (Task 12.9)
├── docker-compose.yml       # local Postgres + Redis (Task 1.7)
├── README.md
├── CURRENT_TASK.md
└── package.json
```

## `src/app` — App Router

```
src/app/
├── layout.tsx                       # root layout, providers, fonts
├── page.tsx                         # home
├── error.tsx / not-found.tsx        # route-level error boundaries
├── global-error.tsx
├── (storefront)/
│   ├── products/
│   │   ├── page.tsx                 # listing (Server Component)
│   │   └── [slug]/page.tsx          # detail + generateMetadata
│   ├── categories/[slug]/page.tsx
│   ├── search/page.tsx
│   ├── cart/page.tsx                # thin shell; client island for mutations
│   └── checkout/page.tsx
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── reset-password/page.tsx
├── account/
│   ├── page.tsx
│   ├── orders/page.tsx
│   ├── orders/[id]/page.tsx
│   ├── addresses/page.tsx
│   └── wishlist/page.tsx
├── admin/
│   ├── layout.tsx                   # admin shell + RBAC guard
│   ├── page.tsx                     # dashboard
│   ├── products/page.tsx
│   ├── categories/page.tsx
│   ├── inventory/page.tsx
│   ├── orders/page.tsx
│   ├── customers/page.tsx
│   ├── coupons/page.tsx
│   └── reviews/page.tsx
└── api/
    ├── auth/[...]/route.ts
    ├── products/route.ts
    ├── products/[slug]/route.ts
    ├── cart/items/route.ts
    ├── checkout/route.ts
    ├── payments/verify/route.ts
    ├── webhooks/razorpay/route.ts
    └── ...
```

**Rules:**
- Route groups `(storefront)` and `(auth)` affect URLs and layouts only, not module ownership.
- `page.tsx`/`layout.tsx` are Server Components by default; add `"use client"` only for interactivity.
- Route Handlers contain Zod parsing, guard calls and response mapping — no business logic.
- `generateMetadata` and `generateStaticParams` stay in the route file, calling module facades.

## `src/modules` — Business Modules

One folder per module from Task 0.4:

```
src/modules/products/
├── components/              # module-specific UI (server + client)
├── repositories/
│   └── product.repository.ts
├── schemas/
│   └── product.schema.ts    # Zod schemas + inferred types
├── services/
│   ├── product.service.ts   # business logic
│   └── index.ts             # public facade export only
├── types/
│   └── product.dto.ts       # plain DTOs returned to callers
└── product.constants.ts
```

**Rules:**
- Only `services/index.ts` is importable from outside the module (enforced by code review; ESLint boundaries may be added later).
- Repositories may import `src/lib/prisma`; services may import repositories, schemas, types and other modules' facades.
- No module imports `src/app`. No repository imports a service.
- Files are kebab-case; types/interfaces PascalCase; functions camelCase; Zod schemas suffixed `Schema`.
- Facade methods accept/return DTOs, not Prisma models.

## Shared Code

```
src/components/ui/           # shadcn/ui primitives and composed app components
src/components/layout/       # headers, footers, nav shared across routes
src/lib/
├── auth/                    # Auth.js config, session/permission helpers
├── cache/                   # cache keys, tags, get-or-set helpers
├── db/                      # Prisma client singleton, transaction helper
├── redis/                   # Redis client (Task 2.7)
├── errors/                  # AppError hierarchy + HTTP mapper
├── logging/                 # structured logger + correlation context
├── money/                   # minor-unit arithmetic, formatting, tax helpers
├── http/                    # response envelope, pagination helpers
└── utils.ts
src/config/
├── env.ts                   # Zod-validated environment access
├── constants.ts
└── permissions.ts           # resource:action definitions
src/tests/                   # test factories, DB cleanup, mock helpers
tests/e2e/                   # Playwright specs
```

## Documentation

```
docs/
├── requirements.md
├── roles-and-permissions.md
├── modules.md
├── architecture.md
├── database/er-diagram.md
├── api/README.md
├── scalability.md
└── adr/                     # optional deeper decision records later
```

## Import Alias

Use `@/*` -> `src/*` via `tsconfig.json`. No deep relative imports (`../../..`) across module boundaries.

## Enforcement Checklist for Future Tasks

- [ ] Route Handlers/Server Actions contain no queries or business rules.
- [ ] Services contain no JSX and no `next/headers` imports (except actor-context adapters).
- [ ] Repositories contain no permission checks or price logic.
- [ ] Cross-module imports target `services/index.ts` only.
- [ ] Every new list endpoint has cursor pagination and a Zod query schema.
- [ ] Client components are justified by interactivity (forms, state, browser APIs).
