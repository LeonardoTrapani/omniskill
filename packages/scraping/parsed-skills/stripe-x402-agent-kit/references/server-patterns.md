# Server Patterns for x402

## Hono (Recommended)

Hono has first-class x402 support via `@x402/hono`.

### Basic Setup

```typescript
import Stripe from "stripe";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL || "https://x402.org/facilitator",
});

const app = new Hono();
```

### Dynamic PayTo Address with Stripe

The `createPayToAddress` function generates a new Stripe PaymentIntent for each transaction, which provides a unique deposit address:

```typescript
const validPayToAddresses = new Set<string>();

async function createPayToAddress(context: any): Promise<string> {
  // Handle retry: extract address from existing payment header
  if (context.paymentHeader) {
    const decoded = JSON.parse(Buffer.from(context.paymentHeader, "base64").toString());
    const toAddress = decoded.payload?.authorization?.to;
    if (toAddress && validPayToAddresses.has(toAddress.toLowerCase())) {
      return toAddress.toLowerCase();
    }
    throw new Error("Invalid payTo address: not in server cache");
  }

  // Create new PaymentIntent for fresh deposit address
  const decimals = 6;
  const amountInCents = Number(10000) / Math.pow(10, decimals - 2);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    payment_method_types: ["crypto"],
    payment_method_data: { type: "crypto" },
    payment_method_options: {
      crypto: { mode: "custom" } as any,
    },
    confirm: true,
  });

  const depositDetails = (paymentIntent.next_action as any)?.crypto_collect_deposit_details;
  const payToAddress = depositDetails?.deposit_addresses?.["base"]?.address as string;

  validPayToAddresses.add(payToAddress.toLowerCase());
  return payToAddress.toLowerCase();
}
```

### Payment Middleware

```typescript
app.use(
  paymentMiddleware(
    {
      "GET /api/weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:84532",
            payTo: createPayToAddress,
          },
        ],
        description: "Weather data",
        mimeType: "application/json",
      },
      "POST /api/analyze": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.10",
            network: "eip155:84532",
            payTo: createPayToAddress,
          },
        ],
        description: "AI analysis endpoint",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register("eip155:84532", new ExactEvmScheme()),
  ),
);
```

### Multiple Price Tiers

```typescript
app.use(
  paymentMiddleware(
    {
      "GET /api/basic": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "eip155:84532",
            payTo: createPayToAddress,
          },
        ],
        description: "Basic tier",
        mimeType: "application/json",
      },
      "GET /api/premium": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.05",
            network: "eip155:84532",
            payTo: createPayToAddress,
          },
        ],
        description: "Premium tier",
        mimeType: "application/json",
      },
      "GET /api/enterprise": {
        accepts: [
          {
            scheme: "exact",
            price: "$1.00",
            network: "eip155:84532",
            payTo: createPayToAddress,
          },
        ],
        description: "Enterprise tier",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register("eip155:84532", new ExactEvmScheme()),
  ),
);
```

## Express Pattern

For Express-based servers, use `@x402/express` (if available) or manual middleware:

```typescript
import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";

const app = express();

// Manual x402 middleware for Express
function x402Gate(price: string, network: string) {
  return async (req, res, next) => {
    const paymentHeader = req.headers["x-payment"];

    if (!paymentHeader) {
      return res.status(402).json({
        accepts: [
          {
            scheme: "exact",
            price,
            network,
            payTo: await createPayToAddress({}),
          },
        ],
        description: "Payment required",
      });
    }

    // Verify payment via facilitator
    try {
      const facilitator = new HTTPFacilitatorClient({
        url: process.env.FACILITATOR_URL!,
      });
      const result = await facilitator.verify(paymentHeader, { price, network });
      if (result.valid) {
        next();
      } else {
        res.status(402).json({ error: "Payment verification failed" });
      }
    } catch (error) {
      res.status(500).json({ error: "Payment processing error" });
    }
  };
}

app.get("/api/data", x402Gate("$0.01", "eip155:84532"), (req, res) => {
  res.json({ data: "premium content" });
});
```

## CORS Configuration

x402 requires specific headers to be exposed for the client to read payment requirements:

```typescript
import { cors } from "hono/cors";

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Payment"],
    exposeHeaders: ["X-Payment-Required", "X-Payment-Response"],
  }),
);
```

## Static PayTo Address (Simple)

For simple setups without per-transaction addresses, use a static wallet:

```typescript
"GET /api/data": {
  accepts: [{
    scheme: "exact",
    price: "$0.01",
    network: "eip155:84532",
    payTo: "0xYourWalletAddress",  // Static address
  }],
  description: "Data endpoint",
  mimeType: "application/json",
},
```
