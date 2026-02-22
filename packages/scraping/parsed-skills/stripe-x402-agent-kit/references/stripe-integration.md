# Stripe Integration for x402

## Overview

Stripe handles the fiat-to-crypto bridge for x402 payments. When a server receives a payment, Stripe creates a PaymentIntent with `crypto` payment method, generating a unique deposit address on Base. The on-chain USDC transfer is matched to this PaymentIntent for settlement.

## PaymentIntent with Crypto

### Creating a PaymentIntent

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
  appInfo: {
    name: "your-app-name",
    version: "1.0.0",
  },
});

const paymentIntent = await stripe.paymentIntents.create({
  amount: 100, // Amount in cents ($1.00)
  currency: "usd",
  payment_method_types: ["crypto"],
  payment_method_data: {
    type: "crypto",
  },
  payment_method_options: {
    crypto: {
      // @ts-ignore - Beta feature
      mode: "custom",
    },
  },
  confirm: true,
});
```

### Extracting the Deposit Address

After creating and confirming a PaymentIntent, the `next_action` contains deposit details:

```typescript
if (paymentIntent.next_action && "crypto_collect_deposit_details" in paymentIntent.next_action) {
  const depositDetails = (paymentIntent.next_action as any).crypto_collect_deposit_details;

  // Get the Base network deposit address
  const baseAddress = depositDetails.deposit_addresses["base"].address;
  console.log(`Deposit to: ${baseAddress}`);

  // Other available networks (if enabled)
  // depositDetails.deposit_addresses["ethereum"]
  // depositDetails.deposit_addresses["solana"]
}
```

### Amount Calculation

USDC has 6 decimals. To convert from USDC base units to Stripe cents:

```typescript
const USDC_DECIMALS = 6;

// From price string to Stripe amount
function priceToStripeAmount(price: string): number {
  const usdAmount = parseFloat(price.replace("$", ""));
  return Math.round(usdAmount * 100); // Convert to cents
}

// From USDC base units to Stripe amount
function usdcToStripeAmount(usdcBaseUnits: number): number {
  return usdcBaseUnits / Math.pow(10, USDC_DECIMALS - 2);
}

// Examples:
// "$0.01" -> 1 cent -> Stripe amount: 1
// "$1.00" -> 100 cents -> Stripe amount: 100
// 10000 USDC base units -> $0.01 -> Stripe amount: 1
```

## Address Validation

Always validate that addresses in payment headers match server-generated addresses:

```typescript
const validPayToAddresses = new Set<string>();

async function createPayToAddress(context: any): Promise<string> {
  // On retry: validate against cache
  if (context.paymentHeader) {
    const decoded = JSON.parse(Buffer.from(context.paymentHeader, "base64").toString());
    const toAddress = decoded.payload?.authorization?.to;

    if (!toAddress || !validPayToAddresses.has(toAddress.toLowerCase())) {
      throw new Error("Invalid payTo address: not found in server cache");
    }
    return toAddress.toLowerCase();
  }

  // On first request: create new address
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 100,
    currency: "usd",
    payment_method_types: ["crypto"],
    payment_method_data: { type: "crypto" },
    payment_method_options: { crypto: { mode: "custom" } as any },
    confirm: true,
  });

  const address = (paymentIntent.next_action as any)?.crypto_collect_deposit_details
    ?.deposit_addresses?.["base"]?.address;

  validPayToAddresses.add(address.toLowerCase());
  return address.toLowerCase();
}
```

## Stripe Dashboard

### Viewing Crypto Payments

1. Go to **Payments** in the Stripe Dashboard
2. Filter by payment method: **crypto**
3. Each payment shows:
   - PaymentIntent ID
   - Amount in USD
   - Deposit address
   - On-chain transaction hash (after settlement)
   - Status: `requires_action` -> `processing` -> `succeeded`

### Webhooks

Listen for crypto payment events:

```typescript
// Webhook handler
app.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature")!;
  const body = await c.req.text();
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  switch (event.type) {
    case "payment_intent.succeeded":
      const pi = event.data.object;
      if (pi.payment_method_types?.includes("crypto")) {
        console.log(`Crypto payment settled: ${pi.id} - $${pi.amount / 100}`);
      }
      break;
    case "payment_intent.payment_failed":
      console.log(`Payment failed: ${event.data.object.id}`);
      break;
  }

  return c.json({ received: true });
});
```

## Stripe API Version

The x402 crypto features require the **Clover** API version:

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});
```

## Requirements

- Stripe account with **crypto payments** enabled
- Must be registered for the Stripe crypto beta
- US-based Stripe accounts (initially)
- Request access at: https://stripe.com/docs/crypto

## Testing

In test mode (`sk_test_...`), crypto PaymentIntents work on **Base Sepolia** testnet:

- No real funds are transferred
- Use testnet USDC faucets for client wallet
- PaymentIntents show in test mode Dashboard
