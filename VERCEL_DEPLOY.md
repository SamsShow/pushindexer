# Vercel Deployment Guide

This project is configured to deploy on Vercel with two separate API endpoints:

1. **Facilitator API** (`/api/facilitator/*`) - For x402 protocol contract interactions
2. **Indexer API** (`/api/indexer/*`) - For querying indexed transactions

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. Environment variables configured

## Deployment Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

In Vercel dashboard, go to your project settings and add these environment variables:

```
PUSH_CHAIN_RPC_URL=https://evm.rpc-testnet-donut-node1.push.org/
PUSH_CHAIN_WS_URL=wss://evm.rpc-testnet-donut-node1.push.org/
PUSH_CHAIN_ID=42101
FACILITATOR_CONTRACT_ADDRESS=0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
DATABASE_URL=postgresql://...
PRIVATE_KEY=your_private_key_here
```

**Important**: Never commit your `PRIVATE_KEY` to git. Only add it in Vercel's environment variables.

### 3. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Deploy to production
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## API Endpoints

After deployment, you'll get two base URLs:

### Facilitator API (for x402 protocol)

Base URL: `https://your-project.vercel.app/api/facilitator`

**Endpoints:**

1. **Native Transfer**
   ```
   POST /api/facilitator/native-transfer
   Body: {
     "recipient": "0x...",
     "amount": "0.001"
   }
   ```

2. **Token Transfer**
   ```
   POST /api/facilitator/token-transfer
   Body: {
     "token": "0x...",
     "recipient": "0x...",
     "amount": "100"
   }
   ```

3. **Cross-Chain Operation**
   ```
   POST /api/facilitator/cross-chain
   Body: {
     "target": "0x...",
     "value": "0.001",
     "data": "0x..."
   }
   ```

### Indexer API (for querying transactions)

Base URL: `https://your-project.vercel.app/api/indexer`

**Endpoints:**

1. **Get Events**
   ```
   GET /api/indexer/events?address=0x...&page=1&limit=50
   ```

2. **Get Transaction by Hash**
   ```
   GET /api/indexer/tx?hash=0x...
   ```

3. **Get Statistics**
   ```
   GET /api/indexer/stats
   ```

## Example Usage

### Facilitator API (x402 Protocol)

```bash
# Native transfer
curl -X POST https://your-project.vercel.app/api/facilitator/native-transfer \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0x93974d6642126b1315C8854B9FeF66DbB2A4cc2C",
    "amount": "0.001"
  }'
```

### Indexer API

```bash
# Get all events
curl https://your-project.vercel.app/api/indexer/events

# Get events for specific address
curl "https://your-project.vercel.app/api/indexer/events?address=0x93974d6642126b1315C8854B9FeF66DbB2A4cc2C"

# Get transaction details
curl "https://your-project.vercel.app/api/indexer/tx?hash=0x..."

# Get statistics
curl https://your-project.vercel.app/api/indexer/stats
```

## Project Structure

```
api/
├── facilitator/          # x402 protocol endpoints
│   ├── native-transfer.ts
│   ├── token-transfer.ts
│   └── cross-chain.ts
└── indexer/             # Indexer query endpoints
    ├── events.ts
    ├── tx.ts
    └── stats.ts
```

## Important Notes

1. **Private Key Security**: The facilitator API uses a private key to sign transactions. Make sure:
   - Never commit the private key to git
   - Only use a testnet private key (not mainnet)
   - Store it securely in Vercel environment variables

2. **Database Connection**: The indexer API requires a database connection. Make sure your `DATABASE_URL` is set correctly in Vercel.

3. **Rate Limiting**: Consider adding rate limiting for production use.

4. **CORS**: CORS is enabled by default. Adjust if needed for your frontend domain.

## Troubleshooting

### Build Errors

If you get TypeScript errors, make sure:
- All dependencies are installed
- TypeScript is configured correctly
- Source files are in the correct location

### Runtime Errors

Check Vercel function logs:
```bash
vercel logs
```

Common issues:
- Missing environment variables
- Database connection timeout
- Invalid contract address or RPC URL

### Database Connection Issues

If you see database connection errors:
- Verify `DATABASE_URL` is correct
- Check if your database allows connections from Vercel's IPs
- Ensure SSL is enabled (Neon requires it)

## Next Steps

1. Set up monitoring and alerts
2. Add authentication/API keys for production
3. Implement rate limiting
4. Set up CI/CD for automatic deployments
5. Add error tracking (e.g., Sentry)

