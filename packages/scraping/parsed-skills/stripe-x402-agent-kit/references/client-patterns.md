# Client Patterns for x402

## Basic Client Setup

### Install Dependencies

```bash
npm install @x402/fetch @x402/evm viem
```

### Wrap Fetch with Payment

```typescript
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const account = privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
}).extend(publicActions);

const signer = toClientEvmSigner(walletClient as any);
const client = new x402Client();
client.register("eip155:84532", new ExactEvmScheme(signer));

const paidFetch = wrapFetchWithPayment(fetch, client);
```

### Use Like Normal Fetch

```typescript
// Auto-handles 402 responses — payment is transparent
const response = await paidFetch("https://api.example.com/data");
const data = await response.json();

// Works with all fetch options
const postResponse = await paidFetch("https://api.example.com/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query: "analyze this" }),
});
```

## Budget Control

### Per-Request Limit

```typescript
const MAX_PER_REQUEST = 0.1; // $0.10

const budgetFetch = async (url: string, options?: RequestInit) => {
  // First check the price without paying
  const checkRes = await fetch(url, options);
  if (checkRes.status === 402) {
    const requirements = await checkRes.json();
    const price = parseFloat(requirements.accepts[0]?.price?.replace("$", "") || "0");
    if (price > MAX_PER_REQUEST) {
      throw new Error(`Price $${price} exceeds limit $${MAX_PER_REQUEST}`);
    }
  }
  // Proceed with payment
  return paidFetch(url, options);
};
```

### Session Budget Tracker

```typescript
class BudgetTracker {
  private spent = 0;

  constructor(private maxBudget: number) {}

  async fetch(url: string, options?: RequestInit) {
    // Pre-check price
    const checkRes = await fetch(url, options);
    if (checkRes.status === 402) {
      const req = await checkRes.json();
      const price = parseFloat(req.accepts[0]?.price?.replace("$", "") || "0");
      if (this.spent + price > this.maxBudget) {
        throw new Error(
          `Budget exceeded: spent $${this.spent.toFixed(4)}, ` +
            `request $${price}, limit $${this.maxBudget}`,
        );
      }
      this.spent += price;
    }
    return paidFetch(url, options);
  }

  getSpent() {
    return this.spent;
  }
  getRemaining() {
    return this.maxBudget - this.spent;
  }
}

const budget = new BudgetTracker(5.0); // $5.00 session limit
const response = await budget.fetch("https://api.example.com/data");
```

## Wallet Management

### Generate a New Wallet

```typescript
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
console.log(`Address: ${account.address}`);
console.log(`Private Key: ${privateKey}`);
// Save to .env or secure storage
```

### Check USDC Balance

```typescript
import { createPublicClient, http, parseAbi } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia

const balance = await publicClient.readContract({
  address: USDC_ADDRESS,
  abi: parseAbi(["function balanceOf(address) view returns (uint256)"]),
  functionName: "balanceOf",
  args: [account.address],
});

console.log(`USDC Balance: ${Number(balance) / 1e6}`);
```

### Fund Testnet Wallet

Get testnet USDC from faucets:

1. Get Base Sepolia ETH: https://www.alchemy.com/faucets/base-sepolia
2. Get testnet USDC: https://faucet.circle.com/ (select Base Sepolia)

## Multi-Endpoint Discovery

```typescript
// Discover which endpoints require payment
async function discoverEndpoints(baseUrl: string, paths: string[]) {
  const results = [];
  for (const path of paths) {
    const res = await fetch(`${baseUrl}${path}`);
    if (res.status === 402) {
      const req = await res.json();
      results.push({
        path,
        price: req.accepts?.[0]?.price,
        description: req.description,
      });
    } else {
      results.push({ path, price: "free", description: "No payment required" });
    }
  }
  return results;
}

const endpoints = await discoverEndpoints("https://api.example.com", [
  "/",
  "/weather",
  "/premium-data",
  "/analytics",
]);
console.table(endpoints);
```

## Error Handling

```typescript
async function safePaidFetch(url: string) {
  try {
    const response = await paidFetch(url);
    if (!response.ok) {
      if (response.status === 402) {
        console.error("Payment failed — check wallet balance");
      } else {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return null;
    }
    return await response.json();
  } catch (error: any) {
    if (error.message.includes("insufficient")) {
      console.error("Insufficient USDC balance");
    } else {
      console.error(`Fetch error: ${error.message}`);
    }
    return null;
  }
}
```

## MCP Client Integration

For agents using MCP (Model Context Protocol), expose x402 fetch as a tool:

```typescript
// MCP tool definition
const x402FetchTool = {
  name: "x402_fetch",
  description: "Fetch data from x402-protected endpoints, auto-paying with USDC",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to fetch" },
      method: { type: "string", default: "GET" },
    },
    required: ["url"],
  },
  handler: async ({ url, method = "GET" }) => {
    const response = await paidFetch(url, { method });
    return await response.json();
  },
};
```
