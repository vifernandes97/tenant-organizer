---
name: Plans and Subscriptions
description: Entitlements layer above granular permissions. Per-tenant subscription (plans table + tenant_subscriptions), 3 plans (Starter/Agência/Pro), Stripe integration for billing, DB triggers enforce limits.
type: feature
---
- Two tables: `plans` (catalog) and `tenant_subscriptions` (1:1 with tenant, status enum + stripe ids + `plan_override` for internal accounts).
- Effective status via `get_tenant_subscription(tid)`: trialing within deadline / active / past_due in 7d grace use the contracted plan; everything else returns `locked`.
- `has_plan_feature(tid, feature)` and `within_plan_limit(tid, resource)` — single source of truth. Locked → false.
- DB triggers raise typed errors that the frontend identifies via `error.message`: `PLAN_LIMIT_CLIENTS`, `PLAN_LIMIT_MEMBERS`, `PLAN_FEATURE_API`, `PLAN_LOCKED`. Tables: clients, invitations, user_roles, tenant_api_tokens, posts/post_images/post_comments/brainstorm_ideas (lock only).
- Members count = distinct user_roles + pending invitations. Downgrade NEVER deletes/archives — only blocks new creation.
- `create_tenant_with_owner` now seeds a 14-day trial on the Agência plan for every new tenant. Existing tenants were backfilled with Pro + `plan_override=true`.
- Edge functions: `create-checkout` (embedded checkout, owner-only, resolves/creates Stripe customer with `metadata.tenant_id`), `customer-portal`, `payments-webhook` (handles checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_failed). `payments-webhook` respects `plan_override=true` and skips writes.
- Stripe prices via lookup_key: `approvee_{starter|agencia|pro}_monthly` ↔ plan code.
- `auto-publish` cron skips tenants with effective status `locked`.
- Frontend: `usePlan()` returns plan + status + isTrialing + trialDaysLeft + isLocked + usage + canCreateClient/canInviteMember/hasFeature. `usePlansCatalog()` for pricing table.
- `BillingPanel` (Settings → "Plano e Cobrança", owner-only): plan card with progress bars, 3 plan cards, "Gerenciar assinatura" → customer portal. `StripeEmbeddedCheckoutInline` uses `@stripe/react-stripe-js` Embedded Checkout.
- `UpgradeModal` listens for global plan-error events; QueryClient `mutationCache.onError` intercepts every mutation via `maybeHandlePlanError(error)`.
- `PlanStatusBanner` + `PaymentTestModeBanner` in AppLayout. Banner shows trial countdown or locked message.
- Gates: `Clients` page disables "Novo Cliente" with tooltip; `InviteDialog` disables trigger; `ApiTokensManager` shows lock + CTA when `!hasFeature('api_access')`.
- Stripe via Lovable native integration (`enable_stripe_payments`); shared util at `supabase/functions/_shared/stripe.ts` (gateway proxy + `verifyWebhook`). `verify_jwt = false` for all 3 payment functions in `supabase/config.toml`.
