# Logs & Debugging

## stripe logs tail

Stream API request logs in real-time. Shows every API call made to your Stripe account.

### Basic Usage

```bash
# Tail all API logs
stripe logs tail
```

Output shows:

```
2026-02-22 10:30:15 [200] POST /v1/payment_intents pi_123 [req_abc]
2026-02-22 10:30:16 [200] GET /v1/customers/cus_456 [req_def]
2026-02-22 10:30:18 [400] POST /v1/charges [req_ghi]
```

### Filter Flags

| Flag                               | Description                  | Example       |
| ---------------------------------- | ---------------------------- | ------------- |
| `--filter-request-paths PATH`      | Filter by API path           | `/v1/charges` |
| `--filter-http-methods METHOD`     | Filter by HTTP method        | `POST`        |
| `--filter-status-codes CODES`      | Filter by exact status codes | `400,500`     |
| `--filter-status-code-types TYPES` | Filter by status code ranges | `4xx,5xx`     |

### Examples

```bash
# Only show errors
stripe logs tail --filter-status-code-types 4xx,5xx

# Only show charge-related requests
stripe logs tail --filter-request-paths /v1/charges

# Only show POST requests that failed
stripe logs tail \
  --filter-http-methods POST \
  --filter-status-code-types 4xx,5xx

# Monitor payment intents specifically
stripe logs tail --filter-request-paths /v1/payment_intents

# Track webhook endpoint deliveries
stripe logs tail --filter-request-paths /v1/webhook_endpoints

# Multiple path filters
stripe logs tail \
  --filter-request-paths /v1/charges \
  --filter-request-paths /v1/payment_intents

# Only 400 and 402 errors
stripe logs tail --filter-status-codes 400,402

# Successful requests only
stripe logs tail --filter-status-code-types 2xx
```

## Debugging Workflows

### Debug a Failing Payment

```bash
# Terminal 1: Watch for payment errors
stripe logs tail \
  --filter-request-paths /v1/payment_intents \
  --filter-status-code-types 4xx

# Terminal 2: Watch webhook delivery
stripe listen --forward-to localhost:3000/webhook \
  --events payment_intent.payment_failed

# Terminal 3: Trigger the failure
stripe trigger payment_intent.payment_failed
```

### Debug Webhook Signature Issues

```bash
# 1. Get the signing secret
stripe listen --print-secret

# 2. Start listening and watch for signature errors
stripe listen --forward-to localhost:3000/webhook

# 3. Trigger an event and check your server logs
stripe trigger payment_intent.succeeded

# Common fix: ensure you're using raw body (not parsed JSON)
# Express: app.post("/webhook", express.raw({type: "application/json"}), handler)
# NOT: app.post("/webhook", express.json(), handler)
```

### Debug Subscription Lifecycle

```bash
# Watch subscription-related API calls
stripe logs tail --filter-request-paths /v1/subscriptions

# Listen for subscription events
stripe listen \
  --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed \
  --forward-to localhost:3000/webhook

# Trigger full subscription lifecycle
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

### Monitor API Rate and Errors

```bash
# Watch all errors in real-time
stripe logs tail --filter-status-code-types 4xx,5xx

# Common error codes:
# 400 - Bad request (invalid parameters)
# 401 - Authentication failed (bad API key)
# 402 - Request failed (card declined, etc.)
# 404 - Resource not found
# 429 - Rate limited
# 500 - Stripe server error
```

### Quick Health Check

```bash
# Verify CLI is authenticated and working
stripe customers list --limit 1

# Check your account info
stripe get /v1/account | jq '{id, business_type, charges_enabled, payouts_enabled}'
```

## Combining Listen + Logs

For comprehensive debugging, run both in parallel:

```bash
# Terminal 1: Your app server
npm run dev

# Terminal 2: Webhook forwarder (see incoming events)
stripe listen --forward-to localhost:3000/webhook

# Terminal 3: API log tail (see all API calls your app makes)
stripe logs tail --filter-status-code-types 4xx,5xx

# Terminal 4: Trigger and iterate
stripe trigger payment_intent.succeeded
```

This setup lets you see:

- What events Stripe sends (Terminal 2)
- What API calls your code makes in response (Terminal 3)
- Any errors on either side
