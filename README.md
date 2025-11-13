# Push Chain x402 Payment Protocol

A complete implementation of the x402 Payment Protocol for Push Chain, including Facilitator API, Indexer API, and x402 SDK.

## Overview

This repository contains four main components:

1. **Facilitator API** - Smart contract interaction endpoints for x402 payments
2. **Indexer API** - Transaction indexing and query endpoints
3. **x402 SDK** - NPM-publishable SDK for automatic 402 payment handling
4. **Demo Page** - Simple test interface for all components

## Project Structure

```
├── api/
│   ├── facilitator/     # Facilitator contract endpoints
│   ├── indexer/         # Indexer query endpoints
│   ├── demo/            # Demo protected endpoint
│   └── payment/         # Payment processing endpoint
├── packages/
│   └── x402-sdk/        # x402 SDK package (npm publishable)
├── pages/
│   └── demo.tsx         # Simple demo page
├── src/
│   ├── indexer/         # Indexer service code
│   └── db/              # Database client and schema
└── contracts/           # Smart contracts
```

## Quick Start

### Installation

```bash
npm install
```

### Environment Configuration

Create a `.env` file (see `.env.example`):

```bash
PUSH_CHAIN_RPC_URL=https://evm.rpc-testnet-donut-node1.push.org/
PUSH_CHAIN_WS_URL=wss://evm.rpc-testnet-donut-node1.push.org/
PUSH_CHAIN_ID=42101
FACILITATOR_CONTRACT_ADDRESS=0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
DATABASE_URL=postgresql://...
BUYER_PRIVATE_KEY=your_buyer_private_key_here
SELLER_WALLET_ADDRESS=0x0dFd63e8b357eD75D502bb42F6e4eC63E2D84761
```

### Database Setup

1. Create a Neon database at [console.neon.tech](https://console.neon.tech)
2. Add `DATABASE_URL` to your `.env` file
3. Run migrations:

```bash
npm run db:migrate
```

**Note:** For Vercel deployment, see [VERCEL_SETUP.md](./VERCEL_SETUP.md)

### Development

```bash
# Run Next.js dev server (includes demo page)
npm run dev

# Build SDK
npm run build:sdk

# Run SDK in watch mode
npm run sdk:dev

# Run indexer service
npm run indexer

# Run API server
npm run api
```

## Components

### 1. Facilitator API

Contract interaction endpoints for processing payments.

**Endpoints:**
- `GET /api/facilitator/info` - Get contract information
- `POST /api/facilitator/native-transfer` - Process native token transfer
- `POST /api/facilitator/token-transfer` - Process ERC20 token transfer
- `POST /api/facilitator/cross-chain` - Process cross-chain operation

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for detailed documentation.

### 2. Indexer API

Query indexed transactions and events. The indexer supports **on-demand indexing** - if a transaction is not found in the database, it will automatically fetch and index it from the blockchain.

**Endpoints:**
- `GET /api/indexer/tx?hash=0x...` - Get transaction by hash (automatically indexes if not found)
- `GET /api/indexer/events` - Query events with filters
- `GET /api/indexer/stats` - Get statistics

**On-Demand Indexing:**
- When querying a transaction that doesn't exist in the database, the API automatically:
  1. Fetches the transaction from the blockchain RPC
  2. Parses the `FacilitatedTx` event
  3. Stores it in the database
  4. Returns the indexed data immediately

This eliminates the need for a continuously running indexer service for low-volume use cases.

See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for detailed documentation.

### 3. x402 SDK

NPM-publishable SDK for automatic HTTP 402 payment handling.

**Installation:**
```bash
npm install @pushchain/x402-sdk axios
```

**Usage:**
```typescript
import { createX402Client } from '@pushchain/x402-sdk';

const client = createX402Client({
  paymentEndpoint: 'https://api.example.com/api/payment/process',
  facilitatorAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
  chainId: 42101,
});

// Automatically handles 402 responses
const response = await client.get('https://api.example.com/protected/resource');
```

See [packages/x402-sdk/README.md](./packages/x402-sdk/README.md) for detailed SDK documentation.

### 4. Demo Page

Simple test interface at `/demo` to test all components.

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy - the build command will automatically build the SDK

The project is configured with:
- Next.js framework
- Automatic SDK build on deployment
- API routes for Facilitator, Indexer, and Payment endpoints

## Architecture

```
┌─────────────────┐
│   Client App    │
│  (uses x402 SDK)│
└────────┬────────┘
         │ HTTP Request
         ▼
┌─────────────────┐
│  Protected API  │
│  (returns 402)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│   x402 SDK      │─────▶│  Facilitator │
│  (interceptor)  │      │     API      │
└────────┬────────┘      └──────────────┘
         │
         │ Payment Proof
         ▼
┌─────────────────┐      ┌──────────────┐
│  Protected API  │      │   Indexer    │
│  (verifies)     │◀─────│     API      │
└─────────────────┘      └──────────────┘
```

## Development

### Building the SDK

```bash
cd packages/x402-sdk
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

MIT
