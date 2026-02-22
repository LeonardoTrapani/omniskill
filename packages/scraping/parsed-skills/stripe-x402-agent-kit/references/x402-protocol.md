# x402 Protocol Specification

## Overview

x402 extends HTTP with the `402 Payment Required` status code to enable machine-to-machine payments. When a server requires payment for a resource, it returns 402 with payment requirements. The client signs a payment and retries with proof.

## Protocol Flow

```
Client                    Resource Server              Facilitator              Blockchain
  |                            |                           |                       |
  |--- GET /resource --------->|                           |                       |
  |<-- 402 + requirements -----|                           |                       |
  |                            |                           |                       |
  | (sign payment locally)     |                           |                       |
  |                            |                           |                       |
  |--- GET /resource --------->|                           |                       |
  |    + X-Payment header      |                           |                       |
  |                            |--- verify payment ------->|                       |
  |                            |<-- verification result ---|                       |
  |                            |                           |--- settle on-chain -->|
  |<-- 200 + data -------------|                           |                       |
```

## HTTP Headers

### 402 Response (Server -> Client)

The server includes payment requirements in the response body:

```json
{
  "accepts": [
    {
      "scheme": "exact",
      "price": "$0.01",
      "network": "eip155:84532",
      "payTo": "0x1234...abcd"
    }
  ],
  "description": "Weather data endpoint",
  "mimeType": "application/json"
}
```

### Payment Request (Client -> Server)

The client includes a base64-encoded payment proof:

```
X-Payment: eyJwYXlsb2FkIjp7ImF1dGhvcml6YXRpb24iOnsi...
```

The decoded payload contains:

```json
{
  "payload": {
    "authorization": {
      "to": "0x1234...abcd",
      "from": "0xabcd...1234",
      "value": "10000",
      "network": "eip155:84532"
    },
    "signature": "0x..."
  }
}
```

## Actors

### Resource Server

- Hosts the paid API endpoints
- Configures pricing and payment requirements
- Delegates payment verification to the facilitator
- Returns data after successful payment verification

### Client (Agent)

- Discovers payment requirements from 402 responses
- Signs USDC transfer authorization with its wallet
- Sends signed proof in retry request
- Receives data after successful payment

### Facilitator

- Verifies payment proofs are valid
- Settles transactions on-chain
- Acts as trusted intermediary
- Testnet: `https://x402.org/facilitator`

## Networks

| Network      | CAIP-2 ID      | Currency       | Use                 |
| ------------ | -------------- | -------------- | ------------------- |
| Base Sepolia | `eip155:84532` | USDC (testnet) | Development/testing |
| Base Mainnet | `eip155:8453`  | USDC           | Production          |

## Payment Schemes

### Exact Scheme

Requires the exact amount specified in the price field. The client signs a transfer for the exact USDC amount.

```typescript
{
  scheme: "exact",
  price: "$0.01",      // Exact amount required
  network: "eip155:84532",
  payTo: "0x..."       // Destination address (or dynamic function)
}
```

### Price Format

- Prices are specified as strings with `$` prefix: `"$0.01"`, `"$1.00"`
- USDC has 6 decimals: `$0.01` = 10000 base units
- Minimum: `$0.001` (1000 base units)

## USDC Contract Addresses

| Network      | USDC Address                                 |
| ------------ | -------------------------------------------- |
| Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Base Mainnet | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |

## Error Handling

| HTTP Status        | Meaning                                  |
| ------------------ | ---------------------------------------- |
| `402`              | Payment required — includes requirements |
| `400`              | Invalid payment proof                    |
| `402` (with error) | Payment verification failed              |
| `200`              | Payment accepted, data returned          |

## Security Considerations

- Payment proofs are cryptographically signed by the client wallet
- Facilitator verifies signatures before settlement
- PayTo addresses should be validated server-side
- Use testnet for development, mainnet for production
- Never expose private keys in client-side code
