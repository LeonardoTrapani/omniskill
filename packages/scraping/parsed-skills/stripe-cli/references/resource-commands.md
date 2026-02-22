# Resource Commands

Perform CRUD operations on Stripe resources directly from the CLI.

## Discover Resources

```bash
# List all available resource types
stripe resources
```

## Customers

```bash
# Create
stripe customers create --email user@example.com --description "New customer"
stripe customers create --email user@example.com --name "Jane Doe" \
  -d "metadata[plan]=pro" -d "metadata[source]=cli"

# List
stripe customers list --limit 10
stripe customers list --limit 5 --starting-after cus_ABC

# Retrieve
stripe customers retrieve cus_123

# Update
stripe customers update cus_123 -d "name=Jane Smith"
stripe customers update cus_123 -d "metadata[tier]=premium"

# Delete
stripe customers delete cus_123
```

## Products

```bash
# Create
stripe products create --name "Pro Plan" --description "Monthly professional plan"
stripe products create --name "API Access" -d "metadata[tier]=premium"

# List
stripe products list --limit 10
stripe products list -d "active=true"

# Retrieve
stripe products retrieve prod_123

# Update
stripe products update prod_123 -d "name=Enterprise Plan"

# Archive (soft delete)
stripe products update prod_123 -d "active=false"
```

## Prices

```bash
# One-time price
stripe prices create --product prod_123 --unit-amount 2000 --currency usd

# Recurring price
stripe prices create --product prod_123 --unit-amount 2000 --currency usd \
  -d "recurring[interval]=month"

# Yearly recurring
stripe prices create --product prod_123 --unit-amount 20000 --currency usd \
  -d "recurring[interval]=year"

# List prices for a product
stripe prices list -d "product=prod_123"

# Retrieve
stripe prices retrieve price_123
```

## Payment Intents

```bash
# Create
stripe payment_intents create --amount 2000 --currency usd
stripe payment_intents create --amount 5000 --currency usd \
  --customer cus_123 -d "payment_method_types[]=card"

# Confirm with test payment method
stripe payment_intents confirm pi_123 --payment-method pm_card_visa

# List
stripe payment_intents list --limit 10
stripe payment_intents list --customer cus_123

# Retrieve
stripe payment_intents retrieve pi_123

# Cancel
stripe payment_intents cancel pi_123
```

## Charges

```bash
# Retrieve
stripe charges retrieve ch_123

# List
stripe charges list --limit 50
stripe charges list -d "customer=cus_123"

# List recent charges with jq
stripe charges list --limit 5 | jq '.data[] | {id, amount, status}'
```

## Subscriptions

```bash
# Create
stripe subscriptions create --customer cus_123 \
  -d "items[0][price]=price_123"

# List
stripe subscriptions list --customer cus_123
stripe subscriptions list --limit 10 -d "status=active"

# Retrieve
stripe subscriptions retrieve sub_123

# Cancel
stripe subscriptions cancel sub_123

# Cancel at period end
stripe subscriptions update sub_123 -d "cancel_at_period_end=true"
```

## Refunds

```bash
# Full refund
stripe refunds create --charge ch_123

# Partial refund
stripe refunds create --charge ch_123 --amount 500

# Refund a PaymentIntent
stripe refunds create -d "payment_intent=pi_123"

# List
stripe refunds list --limit 10
```

## Invoices

```bash
# Create draft invoice
stripe invoices create --customer cus_123

# Add invoice item
stripe invoiceitems create --customer cus_123 --amount 2000 --currency usd \
  --description "Consulting hour"

# Finalize
stripe invoices finalize_invoice inv_123

# List
stripe invoices list --customer cus_123 --limit 5

# Pay
stripe invoices pay inv_123
```

## Common Flags

| Flag                  | Description           | Example                            |
| --------------------- | --------------------- | ---------------------------------- |
| `--limit N`           | Max results to return | `--limit 10`                       |
| `--starting-after ID` | Pagination cursor     | `--starting-after cus_ABC`         |
| `-d KEY=VALUE`        | Set a field value     | `-d "metadata[key]=value"`         |
| `-d "arr[]=VAL"`      | Append to array       | `-d "payment_method_types[]=card"` |
| `-d "obj[key]=val"`   | Set nested object     | `-d "recurring[interval]=month"`   |

## Piping Output

```bash
# Extract IDs
stripe customers list --limit 5 | jq -r '.data[].id'

# Get specific fields
stripe charges list --limit 3 | jq '.data[] | {id, amount, status, created}'

# Count results
stripe payment_intents list --limit 100 | jq '.data | length'

# Filter by status
stripe subscriptions list --limit 100 | jq '[.data[] | select(.status == "active")] | length'
```

## Test Payment Methods

Use these built-in test payment method tokens with `confirm`:

| Token                            | Card        | Behavior             |
| -------------------------------- | ----------- | -------------------- |
| `pm_card_visa`                   | 4242...4242 | Succeeds             |
| `pm_card_visa_debit`             | 4000...0572 | Debit card, succeeds |
| `pm_card_mastercard`             | 5555...4444 | Succeeds             |
| `pm_card_chargeDeclined`         | 4000...0002 | Declined             |
| `pm_card_authenticationRequired` | 4000...3220 | Requires 3DS         |
