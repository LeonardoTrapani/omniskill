# Webhook Testing with Stripe CLI

## stripe listen

Forward Stripe webhook events to your local development server.

### Basic Usage

```bash
# Forward all events to local endpoint
stripe listen --forward-to localhost:3000/webhook

# Output includes the webhook signing secret:
# > Ready! Your webhook signing secret is whsec_xxxxx
```

### All Flags

| Flag                        | Description                                     |
| --------------------------- | ----------------------------------------------- |
| `--forward-to URL`          | Local endpoint to forward events to             |
| `--events LIST`             | Comma-separated list of events to listen for    |
| `--live`                    | Listen to live mode events (default: test mode) |
| `--latest`                  | Use the latest Stripe API version for events    |
| `--print-secret`            | Print the webhook signing secret and exit       |
| `--skip-verify`             | Skip HTTPS certificate verification             |
| `--use-configured-webhooks` | Load endpoint config from Stripe Dashboard      |
| `--headers HEADERS`         | Custom headers to add to forwarded requests     |
| `--thin-events LIST`        | Listen for v2 thin events                       |
| `--forward-thin-to URL`     | Forward thin events to this endpoint            |

### Examples

```bash
# Filter specific events
stripe listen --events charge.succeeded,charge.failed \
  --forward-to localhost:3000/webhook

# Payment-related events only
stripe listen \
  --events payment_intent.succeeded,payment_intent.payment_failed,charge.succeeded,charge.refunded \
  --forward-to localhost:3000/webhook

# Subscription lifecycle events
stripe listen \
  --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded,invoice.payment_failed \
  --forward-to localhost:3000/webhook

# With custom auth header
stripe listen --forward-to localhost:3000/webhook \
  --headers "Authorization: Bearer my-local-token"

# Thin events for billing meters
stripe listen --thin-events v1.billing.meter.no_meter_found \
  --forward-thin-to localhost:3000/thin-events
```

## stripe trigger

Simulate webhook events for testing. Creates real Stripe API objects in test mode.

### Common Events

```bash
# Payment events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.succeeded
stripe trigger charge.failed
stripe trigger charge.refunded

# Subscription events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Invoice events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger invoice.created

# Customer events
stripe trigger customer.created
stripe trigger customer.updated

# Checkout events
stripe trigger checkout.session.completed
```

### Flags

| Flag                     | Description                                   |
| ------------------------ | --------------------------------------------- |
| `--override FIELD=VALUE` | Override a field value in the triggered event |
| `--add FIELD=VALUE`      | Add a field to the triggered event            |
| `--remove FIELD`         | Remove a field from the triggered event       |
| `--stripe-account ACCT`  | Trigger for a connected account               |
| `--live`                 | Trigger in live mode (careful!)               |
| `--api-version VERSION`  | Use a specific API version                    |

### Examples

```bash
# Override amount
stripe trigger charge.succeeded --override amount=5000

# Add metadata
stripe trigger charge.succeeded --add metadata[order_id]=12345

# Multiple overrides
stripe trigger payment_intent.succeeded \
  --override amount=10000 \
  --add metadata[user_id]=usr_456 \
  --add metadata[plan]=premium

# Connected account
stripe trigger charge.succeeded --stripe-account acct_123
```

## Signing Secret

When `stripe listen` starts, it prints a webhook signing secret (`whsec_...`). Use it in your code to verify webhook signatures.

### Node.js / Express

```javascript
const endpointSecret = "whsec_..."; // From stripe listen output

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      console.log("Payment succeeded:", event.data.object.id);
      break;
  }

  res.json({ received: true });
});
```

### Python / Flask

```python
endpoint_secret = "whsec_..."  # From stripe listen output

@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.data
    sig_header = request.headers.get("Stripe-Signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except stripe.error.SignatureVerificationError:
        return "Invalid signature", 400

    if event["type"] == "payment_intent.succeeded":
        print(f"Payment succeeded: {event['data']['object']['id']}")

    return "OK", 200
```

## Full Testing Workflow

```bash
# Step 1: Start your app server
npm run dev

# Step 2: Start listening (in a separate terminal)
stripe listen --forward-to localhost:3000/webhook
# Copy whsec_... to your .env or code

# Step 3: Trigger events (in a third terminal)
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger customer.subscription.created
stripe trigger charge.refunded

# Step 4: Verify your handlers processed correctly
# Check your app logs and database state
```
