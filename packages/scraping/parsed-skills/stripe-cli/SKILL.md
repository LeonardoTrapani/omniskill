---
name: stripe-cli
description: "Stripe CLI for local development, webhook testing, and API interaction from the terminal. Use when the user wants to: test webhooks locally, trigger Stripe events, create/list/update Stripe resources from CLI, tail API logs, make direct API requests, or set up local Stripe development. Triggers: 'stripe cli', 'stripe listen', 'stripe trigger', 'webhook testing', 'stripe logs', 'stripe terminal', 'test webhooks locally', 'stripe command'."
allowed-tools: Bash(stripe:*), Bash(npm:*), Bash(brew:*), Bash(scoop:*)
---

# Stripe CLI

The Stripe CLI lets you interact with Stripe directly from the terminal. Use it for local webhook testing, creating/managing resources, tailing API logs, and making direct API requests.

## Setup & Authentication

```bash
# Install
brew install stripe/stripe-cli/stripe   # macOS
scoop install stripe                     # Windows
# Or download from https://github.com/stripe/stripe-cli/releases

# Login (opens browser for OAuth)
stripe login

# Login without browser
stripe login --interactive

# Logout
stripe logout

# Shell autocomplete
stripe completion bash > /etc/bash_completion.d/stripe
stripe completion zsh > "${fpath[1]}/_stripe"
```

## Webhook Testing

The primary use case. Forward Stripe events to your local server for testing.

### Listen for Events

```bash
# Forward all events to local server
stripe listen --forward-to localhost:3000/webhook

# Filter specific events
stripe listen --events charge.succeeded,payment_intent.succeeded \
  --forward-to localhost:3000/webhook

# Print the webhook signing secret (use in your code to verify signatures)
stripe listen --print-secret

# Listen in live mode (careful!)
stripe listen --forward-to localhost:3000/webhook --live

# Use latest API version for events
stripe listen --forward-to localhost:3000/webhook --latest

# Load webhook config from Dashboard
stripe listen --use-configured-webhooks

# Custom headers on forwarded requests
stripe listen --forward-to localhost:3000/webhook \
  --headers "Authorization: Bearer token"

# Thin events (reduced payload)
stripe listen --thin-events v1.billing.meter.no_meter_found \
  --forward-thin-to localhost:3000/thin-events
```

### Trigger Test Events

```bash
# Trigger a single event
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded

# Override event data
stripe trigger charge.succeeded \
  --override amount=5000 \
  --add metadata[order_id]=12345 \
  --remove description

# Trigger for a connected account
stripe trigger charge.succeeded --stripe-account acct_123

# Trigger in live mode
stripe trigger charge.refunded --live
```

### Typical Webhook Testing Workflow

```bash
# Terminal 1: Start your server
npm run dev  # or python app.py, etc.

# Terminal 2: Forward Stripe events
stripe listen --forward-to localhost:3000/webhook --print-secret
# Copy the whsec_... secret to your .env

# Terminal 3: Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

See [references/webhook-testing.md](references/webhook-testing.md) for all events, flags, and signing secret usage.

## Resource Commands

CRUD operations on Stripe resources directly from CLI.

```bash
# List available resources
stripe resources

# Customers
stripe customers create --email test@example.com --description "Test customer"
stripe customers list --limit 10
stripe customers retrieve cus_123
stripe customers update cus_123 -d "metadata[tier]=premium"
stripe customers delete cus_123

# Charges
stripe charges retrieve ch_123
stripe charges list --limit 50

# Payment Intents
stripe payment_intents create --amount 2000 --currency usd
stripe payment_intents confirm pi_123 --payment-method pm_card_visa
stripe payment_intents list --limit 5

# Products & Prices
stripe products create --name "Pro Plan" --description "Monthly pro subscription"
stripe prices create --product prod_123 --unit-amount 2000 --currency usd \
  -d "recurring[interval]=month"

# Refunds
stripe refunds create --charge ch_123 --amount 1000

# Subscriptions
stripe subscriptions list --customer cus_123
```

See [references/resource-commands.md](references/resource-commands.md) for complete CRUD reference.

## HTTP Commands

Make direct API requests when resource commands aren't enough.

```bash
# GET — retrieve or list
stripe get /v1/charges/ch_123
stripe get /v1/charges --limit 10

# POST — create or update
stripe post /v1/charges \
  -d amount=2000 \
  -d currency=usd \
  -d source=tok_visa \
  -d "metadata[order]=123"

# POST with expand
stripe post /v1/payment_intents \
  -d amount=5000 \
  -d currency=usd \
  -d "payment_method_types[]=card" \
  -e customer \
  -e payment_method

# DELETE
stripe delete /v1/customers/cus_123

# Pipe to jq for processing
stripe get /v1/charges --limit 5 | jq '.data[].amount'
```

See [references/http-commands.md](references/http-commands.md) for all flags and scripting patterns.

## Logs & Monitoring

Tail API request logs in real-time for debugging.

```bash
# Tail all logs
stripe logs tail

# Filter by path, method, status
stripe logs tail \
  --filter-request-paths /v1/charges \
  --filter-http-methods POST \
  --filter-status-codes 400,500

# Filter by status code range
stripe logs tail --filter-status-code-types 4xx,5xx
```

See [references/logs-and-debugging.md](references/logs-and-debugging.md) for debugging workflows.

## Common Patterns

### Debug a Failing Webhook

```bash
# 1. Start listening with verbose output
stripe listen --forward-to localhost:3000/webhook

# 2. Trigger the problematic event
stripe trigger invoice.payment_failed

# 3. Check API logs for errors
stripe logs tail --filter-status-code-types 4xx,5xx
```

### Quick Test Payment Flow

```bash
# Create a customer
stripe customers create --email test@example.com | jq -r '.id'

# Create a PaymentIntent
stripe payment_intents create --amount 2000 --currency usd \
  --customer cus_XXXX | jq -r '.id'

# Confirm it with test card
stripe payment_intents confirm pi_XXXX --payment-method pm_card_visa
```

### Inspect an Object

```bash
# Get full details with expansions
stripe get /v1/payment_intents/pi_123 -e payment_method -e customer
```

## Deep-Dive Documentation

| Reference                                                            | When to Use                                         |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| [references/webhook-testing.md](references/webhook-testing.md)       | Listen, trigger, forward events, signing secrets    |
| [references/resource-commands.md](references/resource-commands.md)   | CRUD on customers, products, charges, subscriptions |
| [references/http-commands.md](references/http-commands.md)           | Direct GET/POST/DELETE, scripting with jq           |
| [references/logs-and-debugging.md](references/logs-and-debugging.md) | Tail logs, filter by path/method/status             |
