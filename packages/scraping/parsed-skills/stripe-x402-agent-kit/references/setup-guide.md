# Setup Guide: x402 Agentic Payments from Zero

## Prerequisites

- Node.js 18+
- A Stripe account (with crypto payments enabled)
- An EVM wallet (generated or existing)

## Step 1: Stripe Account Setup

### 1a. Create/Access Stripe Account

1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Stay in **Test Mode** (toggle in top-right)

### 1b. Enable Crypto Payments

1. Navigate to **Settings > Product settings > Crypto**
2. Enable crypto payments (beta)
3. If not available, request access at https://stripe.com/docs/crypto

### 1c. Get API Keys

1. Go to **Developers > API Keys**
2. Copy the **Secret key** (`sk_test_...`)
3. Save as `STRIPE_SECRET_KEY` in `.env`

## Step 2: Agent Wallet Setup

### 2a. Generate a New Wallet

```bash
node -e "
const crypto = require('crypto');
const key = '0x' + crypto.randomBytes(32).toString('hex');
console.log('EVM_PRIVATE_KEY=' + key);
"
```

Or with viem:

```typescript
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
console.log(`Address: ${account.address}`);
console.log(`Private Key: ${privateKey}`);
```

### 2b. Fund the Wallet (Testnet)

1. **Get Base Sepolia ETH** (for gas):
   - Go to https://www.alchemy.com/faucets/base-sepolia
   - Enter your wallet address
   - Request testnet ETH

2. **Get Testnet USDC**:
   - Go to https://faucet.circle.com/
   - Select **Base Sepolia**
   - Enter your wallet address
   - Request testnet USDC

### 2c. Verify Balance

```typescript
import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const balance = await client.readContract({
  address: USDC,
  abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
  functionName: "balanceOf",
  args: ["0xYourWalletAddress"],
});

console.log(`USDC Balance: ${Number(balance) / 1e6}`);
```

## Step 3: Project Setup

### 3a. Initialize Project

```bash
mkdir my-x402-project && cd my-x402-project
npm init -y
```

### 3b. Install Dependencies

For a **server** (earns payments):

```bash
npm install @hono/node-server @x402/core @x402/evm @x402/hono hono stripe dotenv
npm install -D @types/node tsx typescript
```

For a **client** (makes payments):

```bash
npm install @x402/fetch @x402/evm viem dotenv
npm install -D @types/node tsx typescript
```

For **both**:

```bash
npm install @hono/node-server @x402/core @x402/evm @x402/fetch @x402/hono hono stripe viem dotenv
npm install -D @types/node tsx typescript
```

### 3c. Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 3d. Environment Variables

Create `.env`:

```bash
# Server
STRIPE_SECRET_KEY=sk_test_your_key_here
FACILITATOR_URL=https://x402.org/facilitator

# Client
EVM_PRIVATE_KEY=0xyour_private_key_here
SERVER_URL=http://localhost:4242
```

## Step 4: Run the Demo

### 4a. Start the Server

```bash
npx tsx src/server.ts
```

Expected output:

```
x402 Demo Server listening at http://localhost:4242
  GET /          -> Health check (free)
  GET /weather   -> Weather data ($0.01 USDC)
  GET /premium-data -> Premium data ($0.05 USDC)
```

### 4b. Test with curl

```bash
# Free endpoint
curl http://localhost:4242/

# Protected endpoint (should return 402)
curl -v http://localhost:4242/weather
# HTTP/1.1 402 Payment Required
```

### 4c. Run the Client

```bash
npx tsx src/client.ts
```

Expected output:

```
=== x402 Agent Payment Demo ===

--- Health Check (free) ---
Status: 200 OK
Data: { "status": "ok", ... }

--- Weather Data ($0.01 USDC) ---
Status: 200 OK
Data: { "location": "Milan, IT", ... }

--- Premium Data ($0.05 USDC) ---
Status: 200 OK
Data: { "report": "Market Analysis Q1 2026", ... }

=== Demo complete ===
```

## Step 5: Verify on Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/payments
2. You should see PaymentIntents with `crypto` payment method
3. Each shows the deposit address and amount
4. Status should progress: `requires_action` -> `succeeded`

## Troubleshooting

### "STRIPE_SECRET_KEY environment variable is required"

- Check `.env` file exists in project root
- Ensure `dotenv` is imported: `import { config } from "dotenv"; config();`

### 402 but client doesn't auto-pay

- Check `EVM_PRIVATE_KEY` is set correctly (with `0x` prefix)
- Ensure wallet has testnet USDC balance
- Verify facilitator URL is reachable

### "PaymentIntent did not return expected crypto deposit details"

- Stripe account may not have crypto payments enabled
- Must use API version `2026-01-28.clover`
- Must be in test mode for testnet

### "Invalid payTo address"

- Address from payment header doesn't match server cache
- May happen if server restarted between 402 and retry
- Client should retry from scratch

## Network Reference

| Setting     | Testnet                                      | Mainnet                                      |
| ----------- | -------------------------------------------- | -------------------------------------------- |
| Network     | `eip155:84532`                               | `eip155:8453`                                |
| Chain       | Base Sepolia                                 | Base                                         |
| USDC        | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Facilitator | `https://x402.org/facilitator`               | `https://x402.org/facilitator`               |
| Explorer    | https://sepolia.basescan.org                 | https://basescan.org                         |
