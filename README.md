# Push Chain Facilitator Indexer

A production-ready indexer for monitoring and indexing facilitator transactions on Push Chain testnet.

## Features

- **Facilitator Smart Contract**: EVM-compatible contract for token transfers and cross-chain operations
- **Real-time Indexing**: WebSocket-based event monitoring with HTTP polling fallback
- **Neon Database**: Serverless PostgreSQL storage with proper indexing for fast queries
- **REST API**: Fastify-based API for querying indexed transactions
- **Reorg Handling**: Automatic detection and reprocessing of chain reorganizations
- **Confirmation Tracking**: Waits for N confirmations before marking transactions as final

## Architecture

```
Facilitator Contract (Push Chain)
    ↓ Events
Indexer Service (Node.js + ethers.js)
    ↓ Database Writes
Neon (Serverless PostgreSQL)
    ↓ Query API
REST API (Fastify)
```

## Setup

### Prerequisites

- Node.js 18+
- Neon account (free tier available at https://neon.tech)
- Hardhat (for contract deployment)

### Installation

```bash
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `PUSH_CHAIN_RPC_URL`: Push Chain testnet RPC endpoint
- `DATABASE_URL`: Neon database connection string (get from https://console.neon.tech)
- `FACILITATOR_CONTRACT_ADDRESS`: Deployed facilitator contract address

### Database Setup

1. **Create a Neon database:**
   - Sign up at https://neon.tech (free tier available)
   - Create a new project
   - Copy the connection string from the dashboard

2. **Update `.env` with your Neon connection string:**
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

   **Note:** For Neon, you can also run migrations directly from the Neon console SQL editor by copying the contents of `src/db/schema.sql`.

   **📖 For detailed Neon setup instructions, see [NEON_SETUP.md](./NEON_SETUP.md)**

### Deploy Facilitator Contract

```bash
# Compile contracts
npm run compile

# Deploy to Push Chain testnet
npm run deploy
```

### Run Indexer

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Run API Server

```bash
# Development mode
npm run api

# Production mode (after build)
node dist/api/server.js
```

## API Endpoints

- `GET /health` - Health check
- `GET /v1/tx/:txHash` - Get transaction details
- `GET /v1/address/:address/txs` - List transactions by address
- `GET /v1/facilitator/stats` - Aggregate statistics
- `GET /v1/events` - Query event logs with filters

## Development

```bash
# Compile TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## License

MIT

