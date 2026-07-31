# Billing Hardening + Stripe Integration

Production-grade ACID/concurrency hardening of the billing module plus full
Stripe Checkout / PaymentIntent / webhook / subscription / refund wiring.

## 1. Architecture

```
┌──────────────┐   HTTP + JWT   ┌─────────────────────────┐
│  Web client  │ ───────────────▶  /billing/stripe/*      │  stripe_router.py
└──────────────┘                │  (requires auth + admin)│
                                └───────────┬─────────────┘
                                            │ StripeService
┌──────────────┐   raw POST    ┌───────────▼─────────────┐
│    Stripe    │ ──────────────▶  /webhooks/stripe       │  webhook_router.py
└──────────────┘               │  (no auth — signature  │
    signature                    verified by Stripe)     │
    verified                     └───────────┬─────────────┘
                                             │
                                ┌────────────▼─────────────┐
                                │  StripeService            │
                                │  - ensure_customer        │
                                │  - create_checkout_session│
                                │  - create_payment_intent  │
                                │  - subscriptions          │
                                │  - refunds                │
                                │  - handle_webhook         │
                                └───────┬──────────┬────────┘
                                        │          │
                          ┌─────────────▼──┐  ┌────▼──────────────────┐
                          │ billing services│  │ stripe_events ledger  │
                          │ payment/invoice │  │ idempotency (unique   │
                          │ refund/sub      │  │ event_id)             │
                          │ audit/sequence  │  └───────────────────────┘
                          └────────────────┘
```

Key design decisions:

- **Webhooks are the source of truth** for gateway money movement. Local
  payment records are created from `payment_intent.succeeded`,
  `checkout.session.completed`, and `invoice.paid` events, not from optimistic
  client-side responses.
- **Idempotency ledger**: every event id is written to `stripe_events`
  (unique `event_id`) before the handler runs. Re-delivered webhooks return
  the stored outcome without re-running side effects. A concurrent duplicate
  loses the race via `IntegrityError` and is treated as already-processed.
- **Single shared allocator**: webhook handlers route through
  `PaymentService.allocate_payment`, which locks the payment and invoice rows
  with `SELECT ... FOR UPDATE` and recomputes balances from locked rows, so
  concurrent allocations can never over-allocate.
- **Atomic webhook transaction**: on handler failure the session is rolled
  back before the ledger row is marked `failed` — partial side effects never
  commit, and Stripe's retry will see a clean database.
- **Lazy stripe import**: the `stripe` package is imported only when a
  Stripe-capable method runs. The app and test suite import cleanly even when
  the package is missing, and every public method raises
  `BadRequestException("Stripe is not configured")` when `STRIPE_SECRET_KEY`
  is empty, so unconfigured environments degrade gracefully.
- **Origin fallback for refunds**: `charge.refunded` / `refund.updated`
  payloads carry no org metadata; the organization is resolved from the
  matched local payment instead of the event envelope.
- **Document numbering**: gateway payments and refunds mint `PAY-YYYY-NNNNN`
  / `RF-YYYY-NNNNN` numbers through `DocumentSequenceService` (row-locked,
  per-org, per-doc-type).

### Webhook handlers

| Event | Action |
|---|---|
| `checkout.session.completed` | record + allocate cleared payment |
| `checkout.session.expired` | no-op |
| `payment_intent.succeeded` | record + allocate cleared payment |
| `payment_intent.payment_failed` | mark local payment FAILED (if exists) |
| `payment_intent.canceled` | no-op |
| `invoice.paid` | record + allocate cleared payment |
| `invoice.payment_failed` | mark local payment FAILED (if exists) |
| `customer.subscription.created/updated` | sync Stripe status → local subscription |
| `customer.subscription.deleted` | cancel local subscription + SubscriptionEvent |
| `charge.refunded` | create COMPLETED Refund + reverse allocations |
| `refund.updated` | same, via shared `_process_succeeded_refund` |

## 2. New files

| File | Purpose |
|---|---|
| `backend/app/modules/billing/services/stripe_service.py` | All Stripe orchestration |
| `backend/app/modules/billing/routers/stripe_router.py` | Authenticated Stripe endpoints |
| `backend/app/modules/billing/routers/webhook_router.py` | Unauthenticated webhook receiver |

## 3. Modified files

| File | Change |
|---|---|
| `backend/requirements.txt` | added `stripe>=9.0.0` |
| `backend/app/config.py` | added `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY_DEFAULT`, `STRIPE_BILLING_ADDRESS_COLLECTION`, `STRIPE_PAYMENT_METHOD_TYPES` |
| `backend/app/main.py` | registered `stripe_webhook_router` (outside auth) |
| `backend/app/modules/billing/router.py` | included `stripe_router` (under `/billing`) |
| `backend/app/modules/billing/services/payment_service.py` | fixed `METHOD_ALLOWED_FIELDS` (see §6) |
| `backend/app/modules/billing/models.py` | removed duplicate `ix_billing_audit_logs_timestamp` (see §6) |

## 4. API changes

All under `/billing/stripe/*` (require auth; admin for mutating ops):

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/billing/stripe/config` | – | `{configured, publishable_key, currency}` |
| POST | `/billing/stripe/checkout/session` | `invoice_id, success_url, cancel_url` | `{checkout_url, session_id, ...}` |
| POST | `/billing/stripe/payment-intent` | `invoice_id, payment_method_id?` | `{payment_intent_id, client_secret, publishable_key, amount, currency}` |
| GET | `/billing/stripe/customers/{customer_id}/payment-methods` | – | `{payment_methods: [...]}` |
| POST | `/billing/stripe/subscriptions/{subscription_id}/link` | `price_id?` | Stripe subscription object |
| POST | `/billing/stripe/subscriptions/{subscription_id}/cancel` | `cancel_at_period_end?` | cancellation summary |
| POST | `/billing/stripe/refunds/{refund_id}/push` | – | `{gateway_refund_id, status, amount}` |
| POST | `/webhooks/stripe` | raw body + `Stripe-Signature` header | `{received, type, status, result}` |

Webhook endpoint returns **200 on every handled event** (including handler
failures, which surface as `"status": "failed"` in the body) so Stripe stops
retrying. Signature/config failures return 400.

## 5. Environment variables

```env
STRIPE_SECRET_KEY=sk_live_...            # required for all Stripe operations
STRIPE_PUBLISHABLE_KEY=pk_live_...       # returned to clients for PaymentElement
STRIPE_WEBHOOK_SECRET=whsec_...          # required for /webhooks/stripe
STRIPE_CURRENCY_DEFAULT=usd
STRIPE_BILLING_ADDRESS_COLLECTION=required
STRIPE_PAYMENT_METHOD_TYPES=card
```

With empty `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` the endpoints return
400 with a clear message — the app boots and the rest of billing works.

## 6. Bug fixes uncovered during verification

1. **`METHOD_ALLOWED_FIELDS` (payment_service.py)** contained stale keys
   (`payment_method_type`, `provider`, `expiry_month`, `expiry_year`) that do
   not exist on the `PaymentMethod` model. Every
   `POST /billing/payments/methods` and `add_payment_method` call silently
   dropped `payment_type`, `gateway`, `gateway_customer_id`,
   `gateway_payment_method_id`, `status`, `verified_at` — creating broken
   rows or NOT NULL failures. Replaced with the real model field set.
2. **Duplicate index name (models.py)** — `BillingAuditLog.timestamp` had
   both `index=True` (auto-creating `ix_billing_audit_logs_timestamp`) and an
   explicit `Index("ix_billing_audit_logs_timestamp", ...)` in
   `__table_args__`. `Base.metadata.create_all()` and any fresh DB bootstrap
   failed on the duplicate. Dropped `index=True`; the explicit index remains.
3. **`stripe_payment_intent_id` never persisted on `Payment`** — webhook
   handlers looked payments up by intent id, so re-deliveries and
   `charge.refunded` could never match. `_record_cleared_payment` now writes
   the column before commit.
4. **`type: None` in `_finalize_event`** — webhook responses always reported
   `"type": null` regardless of event. Now threads the real event type.
5. **Handler failure committed partial state** — `handle_webhook` now rolls
   back the session before marking the ledger row failed.
6. **`CLEARED → FAILED` transition was impossible** — allocation failure on a
   cleared gateway payment no longer attempts the invalid transition; the
   payment stays CLEARED (money moved) and the failure is logged.
7. **`charge.refunded` / `refund.updated` org resolution** — payloads carry
   no org metadata; resolved from the matched local payment.
8. **`RefundStatusHistory` constructed before flush** — `refund_id` is NOT
   NULL; history row is now created after `flush()` with the real id.

## 7. Migration

No new migration is required for this feature: `payments` already carries
`stripe_payment_intent_id` / `stripe_checkout_session_id`, `invoices` carries
`stripe_invoice_id` / `stripe_payment_intent_id` / `stripe_checkout_session_id`,
`billing_customers.stripe_customer_id` exists, and
`subscriptions.stripe_subscription_id` / `stripe_price_id` / `stripe_cancel_at`
exist — all added by migration `h1b2c3d4e5f6` (the current head).

Schema objects used by this feature: `stripe_events` (idempotency ledger),
`document_sequences`, `payments`, `payment_allocations`, `payment_methods`,
`refunds`, `refund_status_history`, `subscriptions`, `subscription_events`,
`billing_audit_logs`.

## 8. Coverage

### Verified (functional tests against SQLite via `StripeService.handle_webhook`)

- `payment_intent.succeeded` → Payment created CLEARED, `stripe_payment_intent_id`
  + `transaction_id` persisted, allocation created, invoice → PAID.
- Webhook re-delivery → idempotent replay, no side effects.
- `payment_intent.payment_failed` with unknown intent → ignored.
- `charge.refunded` (25.00 of 100.00) → Refund COMPLETED with gateway id,
  allocation reduced to 75.00, invoice → PARTIALLY_PAID (balance 25.00),
  payment stays CLEARED.
- Duplicate `refund.updated` → `already_recorded`, no double reversal.
- `/webhooks/stripe` with unconfigured webhook secret → 400, app still boots.

### Not covered (requires live Stripe keys / Postgres)

- End-to-end Checkout / PaymentElement flows.
- Real signature verification (`stripe.Webhook.construct_event`).
- Stripe subscription creation/cancellation API calls.
- `invoice.paid`, `checkout.session.completed`, `invoice.payment_failed` paths.
- Concurrent webhook delivery under Postgres row locking.
- Migration `h1b2c3d4e5f6` against the real Neon database.

## 9. Compatibility notes

- The `stripe` package is lazily imported; until `pip install -r
  requirements.txt` is run, every Stripe-calling method returns
  `BadRequestException` with a clear message. The rest of the app is
  unaffected.
- FastAPI < 0.111 quirk: a bare `bytes` body parameter is interpreted as a
  query field; the webhook endpoint uses `Request.body()` instead to be
  version-independent and content-type independent.
- `settings` values are read from `backend/.env` (quoted values are handled
  by pydantic-settings). The one-line env parsing used by ad-hoc scripts must
  strip quotes.
- Tests target SQLite via `DATABASE_URL` override; the shared
  `tests/conftest.py` still points at the Neon URL from `.env` and is unsafe
  for automated runs.
