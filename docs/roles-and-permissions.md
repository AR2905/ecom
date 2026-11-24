# Roles and Permissions (Task 0.3)

## Model

Authorization uses **RBAC with ownership scopes**. A permission is `resource:action`. A role is a named set of permissions. Ownership (`own`) means the subject must be the resource owner; `any` means the permission applies globally.

**Default is deny.** A permission not listed in the matrix is not granted. UI hiding is a convenience only; every protected operation is re-checked in the service layer (NFR-SEC-03).

## Roles

| Role | Description | Assignment |
| --- | --- | --- |
| `GUEST` | Unauthenticated visitor. May browse the catalog and use a guest cart. | Implicit, no session |
| `CUSTOMER` | Default role after registration. Owns cart, wishlist, orders, addresses and reviews. | Automatic on signup |
| `ADMIN` | Store operator. Manages catalog, inventory, orders, coupons, reviews and customers. | Granted by `SUPER_ADMIN` |
| `SUPER_ADMIN` | Full control including admin account management and system settings. Bootstrap only. | Seed/bootstrap or existing super admin |

A `SUPPORT` role is intentionally not created. If support staff are needed later, grant a subset of permissions to an existing role instead of adding a code path.

## Permission Matrix

`—` = denied, `own` = only own resources, `any` = all resources.

| Resource | Action | GUEST | CUSTOMER | ADMIN | SUPER_ADMIN |
| --- | --- | --- | --- | --- | --- |
| product | read (public/ACTIVE) | any | any | any | any |
| product | read (DRAFT/ARCHIVED) | — | — | any | any |
| product | create / update / archive | — | — | any | any |
| category | read | any | any | any | any |
| category | create / update / reorder / archive | — | — | any | any |
| inventory | read (public availability) | any | any | any | any |
| inventory | read (reserved / movements) | — | — | any | any |
| inventory | adjust / set threshold | — | — | any | any |
| cart | read / add / update / remove | own (token) | own | own | own |
| wishlist | read / add / remove | — | own | own | own |
| address | read / create / update / delete | — | own | own | own |
| coupon | validate (apply at checkout) | any | any | any | any |
| coupon | create / update / disable | — | — | any | any |
| checkout | create order | any | own | own | own |
| order | read | — | own | any | any |
| order | cancel | — | own (allowed states) | any | any |
| order | transition status | — | — | any | any |
| payment | initiate / verify own | any | own | any | any |
| payment | initiate refund | — | — | any | any |
| review | read (APPROVED) | any | any | any | any |
| review | create | — | own (verified purchase) | own | own |
| review | moderate (approve/reject) | — | — | any | any |
| notification | read | — | own | own | own |
| notification | send manually / retry | — | — | any | any |
| user | read own profile / update | — | own | own | own |
| user | read all / change role | — | — | read only | any |
| analytics | dashboard / reports | — | — | any | any |
| settings | read / update | — | — | — | any |
| auditLog | read | — | — | any | any |

## Ownership Rules

- **Cart (guest):** ownership is proven by an httpOnly `cart_token` cookie, never by a client-supplied user ID.
- **Cart (authenticated):** ownership is `userId`; on login the guest cart is merged into the user's cart and the old token is invalidated.
- **Orders and payments:** users may only see records where `userId` matches the session; admin cross-user access is logged in the audit log.
- **Reviews:** only a user with a delivered/purchased order item for that product may create a review; one review per `(productId, userId)`.
- **Addresses:** users may set a default address only among their own addresses.

## Special Constraints

- An `ADMIN` cannot read or modify system settings and cannot grant `SUPER_ADMIN`; only a super admin can change roles.
- A user cannot escalate their own role through profile updates; `role` is excluded from all user-facing update schemas.
- Payment webhooks and Razorpay callbacks are authenticated by HMAC signature, not by a user session.
- Internal service-to-service calls (future microservices) use a separate `service` principal with explicit scopes; no human role is reused.

## Enforcement Points

| Layer | Mechanism |
| --- | --- |
| Route / Server Action | `requirePermission(resource, action)` or `requireRole(...)` guard before calling a service |
| Service | Re-check authorization with the actor context; services are callable from other services |
| Repository | Always scopes queries by `userId` when the permission is `own` |
| Data | Foreign keys and unique constraints prevent cross-owner references |
| UI | Conditional rendering only; never an authorization decision |

Phase 3 will implement the role enum, permission helper, middleware/route protection, and seed the bootstrap super admin.
