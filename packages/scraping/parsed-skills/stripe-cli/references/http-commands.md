# HTTP Commands

Make direct API requests to any Stripe endpoint using `stripe get`, `stripe post`, and `stripe delete`.

## stripe get

Retrieve resources or list collections.

```bash
# Retrieve a single resource
stripe get /v1/charges/ch_123
stripe get /v1/customers/cus_123
stripe get /v1/payment_intents/pi_123

# List resources
stripe get /v1/charges --limit 10
stripe get /v1/customers --limit 5

# List with filters
stripe get /v1/charges -d "customer=cus_123" --limit 20
stripe get /v1/payment_intents -d "status=succeeded" --limit 10

# Expand related objects
stripe get /v1/payment_intents/pi_123 -e payment_method -e customer
stripe get /v1/charges/ch_123 -e balance_transaction

# Pagination
stripe get /v1/customers --limit 10 -d "starting_after=cus_ABC"
```

## stripe post

Create or update resources.

```bash
# Create a charge
stripe post /v1/charges \
  -d amount=2000 \
  -d currency=usd \
  -d source=tok_visa \
  -d "metadata[order]=order_123"

# Create a PaymentIntent
stripe post /v1/payment_intents \
  -d amount=5000 \
  -d currency=usd \
  -d "payment_method_types[]=card"

# Create a PaymentIntent with expand
stripe post /v1/payment_intents \
  -d amount=5000 \
  -d currency=usd \
  -d "payment_method_types[]=card" \
  -e customer \
  -e payment_method

# Create a customer
stripe post /v1/customers \
  -d email=test@example.com \
  -d name="Test User" \
  -d "metadata[source]=cli"

# Update a customer (POST to specific resource)
stripe post /v1/customers/cus_123 \
  -d "metadata[tier]=premium"

# Create a product + price
stripe post /v1/products \
  -d name="API Access" \
  -d description="Pay-per-request API"

stripe post /v1/prices \
  -d product=prod_123 \
  -d unit_amount=100 \
  -d currency=usd \
  -d "recurring[interval]=month"

# Confirm a PaymentIntent
stripe post /v1/payment_intents/pi_123/confirm \
  -d payment_method=pm_card_visa

# Create a subscription
stripe post /v1/subscriptions \
  -d customer=cus_123 \
  -d "items[0][price]=price_123"

# Create a refund
stripe post /v1/refunds \
  -d payment_intent=pi_123 \
  -d amount=500
```

## stripe delete

Delete resources (where the API supports it).

```bash
# Delete a customer
stripe delete /v1/customers/cus_123

# Delete a product
stripe delete /v1/products/prod_123

# Delete a coupon
stripe delete /v1/coupons/coupon_123

# Delete a webhook endpoint
stripe delete /v1/webhook_endpoints/we_123
```

## Common Flags

| Flag                    | Short | Description                             |
| ----------------------- | ----- | --------------------------------------- |
| `-d KEY=VALUE`          |       | Set request data field                  |
| `-e FIELD`              |       | Expand a related object in the response |
| `--api-version VER`     |       | Use a specific API version              |
| `--stripe-account ACCT` |       | Act on behalf of a connected account    |
| `--live`                |       | Use live mode (default: test mode)      |
| `--idempotency-key KEY` |       | Set idempotency key for POST requests   |

## Data Flag Patterns

```bash
# Simple string/number
-d amount=2000
-d currency=usd
-d email=test@example.com

# Metadata (nested object)
-d "metadata[key]=value"
-d "metadata[order_id]=123"

# Array items
-d "payment_method_types[]=card"
-d "payment_method_types[]=sepa_debit"

# Nested objects
-d "recurring[interval]=month"
-d "recurring[interval_count]=3"

# Indexed array items
-d "items[0][price]=price_123"
-d "items[0][quantity]=2"
-d "items[1][price]=price_456"
```

## Scripting with jq

```bash
# Create customer and capture ID
CUSTOMER_ID=$(stripe post /v1/customers -d email=test@example.com | jq -r '.id')
echo "Created: $CUSTOMER_ID"

# Create PaymentIntent and get client_secret
stripe post /v1/payment_intents -d amount=2000 -d currency=usd | jq -r '.client_secret'

# List all active subscription IDs
stripe get /v1/subscriptions -d "status=active" --limit 100 | jq -r '.data[].id'

# Sum total charges amount
stripe get /v1/charges --limit 100 | jq '[.data[].amount] | add'

# Get charges with specific fields
stripe get /v1/charges --limit 5 | jq '.data[] | {id, amount, status, currency}'

# Find failed payments
stripe get /v1/payment_intents -d "status=requires_payment_method" --limit 50 \
  | jq '.data[] | {id, amount, last_error: .last_payment_error.message}'
```

## Connected Accounts

```bash
# Make requests on behalf of a connected account
stripe get /v1/charges --stripe-account acct_123
stripe post /v1/charges -d amount=1000 -d currency=usd --stripe-account acct_123
```

## API Version Override

```bash
# Use a specific API version
stripe get /v1/charges --api-version 2023-10-16
stripe post /v1/payment_intents -d amount=1000 -d currency=usd --api-version 2024-06-20
```
