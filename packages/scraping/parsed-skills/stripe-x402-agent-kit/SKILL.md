---
name: stripe-x402-agent-kit
description: "Agentic payments with Stripe x402 protocol. Use when the user wants to: pay an API with USDC, monetize endpoints with payment gates, manage crypto wallets for agents, track spending/earning on Stripe Dashboard, or implement the x402 protocol. Triggers: 'payment', 'x402', '402', 'USDC', 'wallet', 'monetize', 'paid API', 'machine payment', 'agent payment', 'crypto payment', 'payment required', 'pay per request'."
allowed-tools: Bash(node:*), Bash(npx:*), Bash(curl:*), Bash(npm:*)
---

# Agentic Payments with Stripe x402

The x402 protocol enables machine-to-machine payments over HTTP. When a server returns `402 Payment Required`, the client automatically pays with USDC on Base blockchain and retries. Stripe handles settlement and provides dashboard analytics.

## Workflow 1: PAY — Agent Pays x402 APIs

Use this when the agent needs to consume a paid API endpoint autonomously.

### Quick Start

```bash
npm install @x402/fetch @x402/evm viem
```

### Pattern: Auto-pay any x402 endpoint

```typescript
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Setup: agent wallet + x402 client
const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
}).extend(publicActions);

const signer = toClientEvmSigner(walletClient as any);
const client = new x402Client();
client.register("eip155:84532", new ExactEvmScheme(signer));

// Wrap fetch — all 402 responses are auto-handled
const paidFetch = wrapFetchWithPayment(fetch, client);

// Use like normal fetch — payment is transparent
const response = await paidFetch("https://api.example.com/data");
const data = await response.json();
```

### How It Works

1. Client sends `GET /data`
2. Server responds `402 Payment Required` with payment requirements in headers
3. `paidFetch` reads requirements, signs USDC transfer with agent wallet
4. Client retries with `X-Payment` header containing signed proof
5. Server verifies via facilitator, returns `200` with data

### Budget Control

```typescript
// Track spending per session
let totalSpent = 0;
const BUDGET_LIMIT = 1.0; // $1.00 max

const budgetFetch = async (url: string) => {
  const res = await paidFetch(url);
  // Parse amount from response headers if available
  totalSpent += parseFloat(res.headers.get("x-payment-amount") || "0");
  if (totalSpent > BUDGET_LIMIT) throw new Error("Budget exceeded");
  return res;
};
```

See [references/client-patterns.md](references/client-patterns.md) for advanced client patterns.

## Workflow 2: EARN — Monetize Endpoints with x402 + Stripe

Use this to add pay-per-request gates to any API endpoint.

### Quick Start

```bash
npm install @x402/hono @x402/evm @x402/core hono @hono/node-server stripe
```

### Pattern: Hono middleware with Stripe settlement

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

// Dynamic pay-to address via Stripe PaymentIntent
const validAddresses = new Set<string>();

async function createPayToAddress(context: any): Promise<string> {
  if (context.paymentHeader) {
    const decoded = JSON.parse(Buffer.from(context.paymentHeader, "base64").toString());
    const toAddress = decoded.payload?.authorization?.to;
    if (toAddress && validAddresses.has(toAddress.toLowerCase())) {
      return toAddress.toLowerCase();
    }
    throw new Error("Invalid payTo address");
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: 100, // $1.00
    currency: "usd",
    payment_method_types: ["crypto"],
    payment_method_data: { type: "crypto" },
    payment_method_options: { crypto: { mode: "custom" } as any },
    confirm: true,
  });

  const depositDetails = (paymentIntent.next_action as any)?.crypto_collect_deposit_details;
  const address = depositDetails?.deposit_addresses?.["base"]?.address;
  validAddresses.add(address.toLowerCase());
  return address.toLowerCase();
}

// Protect endpoints with pricing
app.use(
  paymentMiddleware(
    {
      "GET /api/data": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: "eip155:84532", // Base Sepolia
            payTo: createPayToAddress,
          },
        ],
        description: "Premium data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register("eip155:84532", new ExactEvmScheme()),
  ),
);

app.get("/api/data", (c) => c.json({ result: "premium content" }));

serve({ fetch: app.fetch, port: 4242 });
```

### Networks

| Network      | Chain ID       | Use                   |
| ------------ | -------------- | --------------------- |
| Base Sepolia | `eip155:84532` | Testnet (development) |
| Base Mainnet | `eip155:8453`  | Production            |

See [references/server-patterns.md](references/server-patterns.md) for Express/FastAPI patterns.
See [references/stripe-integration.md](references/stripe-integration.md) for Stripe PaymentIntent details.

## Workflow 3: TRACK — Analytics and Monitoring

Use Stripe Dashboard to monitor all x402 payments.

### Query Payments via Stripe API

```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// List all crypto payments
const payments = await stripe.paymentIntents.list({
  limit: 100,
});

// Filter crypto payments
const cryptoPayments = payments.data.filter((p) => p.payment_method_types?.includes("crypto"));

// Summarize
const total = cryptoPayments.reduce((sum, p) => sum + p.amount, 0);
console.log(`Total crypto payments: ${cryptoPayments.length}`);
console.log(`Total revenue: $${(total / 100).toFixed(2)}`);
```

### Agent Budget Config

Store agent spending config in `.claude/x402-config.json`:

```json
{
  "maxPerRequest": "$0.10",
  "maxPerSession": "$5.00",
  "allowedNetworks": ["eip155:84532", "eip155:8453"],
  "walletAddress": "0x...",
  "trackingEnabled": true
}
```

### Stripe Dashboard

All x402 payments appear in the Stripe Dashboard under Payments:

- Filter by `payment_method_types: crypto`
- Each PaymentIntent shows the deposit address and on-chain tx
- Use Stripe webhooks for real-time notifications

## Environment Setup

Required environment variables:

```bash
# Server (EARN)
STRIPE_SECRET_KEY=sk_test_...        # Stripe API key
FACILITATOR_URL=https://x402.org/facilitator  # x402 facilitator

# Client (PAY)
EVM_PRIVATE_KEY=0x...                # Agent wallet private key
```

See [references/setup-guide.md](references/setup-guide.md) for complete setup from scratch.

## Key Concepts

| Concept           | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| **x402 Protocol** | HTTP extension: server returns 402, client pays and retries |
| **Facilitator**   | Verifies payment proofs, settles on-chain                   |
| **PayTo Address** | Stripe-generated deposit address per transaction            |
| **USDC**          | Stablecoin used for payments (1 USDC = $1)                  |
| **Base**          | L2 blockchain (low fees, fast confirmation)                 |
| **Exact Scheme**  | Payment scheme requiring exact amount                       |

See [references/x402-protocol.md](references/x402-protocol.md) for full protocol specification.

## Deep-Dive Documentation

| Reference                                                            | When to Use                                    |
| -------------------------------------------------------------------- | ---------------------------------------------- |
| [references/x402-protocol.md](references/x402-protocol.md)           | Protocol flow, headers, actors, network IDs    |
| [references/server-patterns.md](references/server-patterns.md)       | Middleware patterns for Hono, Express, FastAPI |
| [references/client-patterns.md](references/client-patterns.md)       | Fetch wrapper, MCP client, budget control      |
| [references/stripe-integration.md](references/stripe-integration.md) | PaymentIntent, deposit addresses, Dashboard    |
| [references/setup-guide.md](references/setup-guide.md)               | Complete setup guide from zero                 |
