# Testing Guide for Push Chain Indexer

This guide will help you test the deployed Facilitator contract and verify that the indexer is working correctly.

## Prerequisites

1. **Contract Deployed**: Your contract is deployed at `0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7` on Push testnet
2. **Account Funded**: Your deployment account needs testnet tokens for gas fees
3. **Indexer Running**: The indexer should be running to capture events
4. **API Server Running**: The API server should be running to query indexed data

## Step 1: Start the Indexer

The indexer listens for events from your deployed contract and stores them in the database.

```bash
# Start the indexer (runs both indexer and API)
npm start

# OR run them separately:
npm run indexer  # Terminal 1: Indexer only
npm run api     # Terminal 2: API server only
```

You should see logs like:
```
[INFO] Starting Push Chain Facilitator Indexer...
[INFO] Chain ID: 42101
[INFO] Facilitator: 0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
[INFO] Initialized indexer state at block 3548471
[INFO] WebSocket subscription active
```

## Step 2: Test the Contract

Interact with your deployed contract to generate events:

```bash
# Run the test script to send a transaction
node scripts/test-contract.cjs
```

This script will:
- Check your account balance
- Call `facilitateNativeTransfer()` to send 0.001 PUSH to yourself
- Display the transaction hash and event details

## Step 3: Query the API

Once the indexer has processed events, you can query them via the API:

### Health Check
```bash
curl http://localhost:3000/health
```

### Get All Events
```bash
curl http://localhost:3000/v1/events
```

### Get Events with Filters
```bash
# Filter by address
curl "http://localhost:3000/v1/events?address=0x93974d6642126b1315C8854B9FeF66DbB2A4cc2C"

# Filter by block range
curl "http://localhost:3000/v1/events?fromBlock=3548400&toBlock=3548500"

# Pagination
curl "http://localhost:3000/v1/events?page=1&limit=10"
```

### Get Statistics
```bash
curl http://localhost:3000/v1/facilitator/stats
```

### Get Transaction by Hash
```bash
curl http://localhost:3000/v1/tx/0x<transaction_hash>
```

### Get Transactions by Address
```bash
curl http://localhost:3000/v1/address/0x93974d6642126b1315C8854B9FeF66DbB2A4cc2C
```

## Step 4: Verify Database

You can also check the database directly:

```bash
# Connect to the database
psql $DATABASE_URL

# Query events
SELECT * FROM facilitator_event ORDER BY created_at DESC LIMIT 10;

# Query transactions
SELECT tx_hash, sender, target, value, tx_type, status 
FROM facilitated_tx 
ORDER BY block_number DESC 
LIMIT 10;

# Check indexer state
SELECT * FROM indexer_state;
```

## Step 5: Test Different Transaction Types

### Native Transfer (Type 0)
```javascript
// Already tested in test-contract.cjs
contract.facilitateNativeTransfer(recipient, amount, { value: amount })
```

### ERC20 Transfer (Type 1)
```javascript
// Requires an ERC20 token contract address
contract.facilitateTokenTransfer(tokenAddress, recipient, amount)
```

### Cross-Chain Operation (Type 2)
```javascript
// Requires a target contract and call data
contract.facilitateCrossChain(targetAddress, value, callData, { value })
```

## Monitoring

### Check Indexer Logs
The indexer logs will show:
- Events being indexed
- Block numbers being processed
- Any errors or warnings

### Check API Logs
The API server logs will show:
- HTTP requests
- Response times
- Any errors

### Metrics Endpoint
```bash
curl http://localhost:3000/metrics
```

## Troubleshooting

### Indexer not picking up events?
1. Check that the contract address in `.env` matches the deployed contract
2. Verify the WebSocket connection is active
3. Check database connection
4. Look for errors in the indexer logs

### API not returning data?
1. Ensure the indexer has processed at least one event
2. Check that the API server is running
3. Verify database connection
4. Check API logs for errors

### Contract interaction failing?
1. Verify your account has testnet tokens
2. Check the contract address is correct
3. Ensure you're connected to Push testnet (chain ID 42101)
4. Check transaction gas limits

## Example Workflow

1. **Start the indexer**: `npm start`
2. **In another terminal, test the contract**: `node scripts/test-contract.cjs`
3. **Wait a few seconds** for the indexer to process the event
4. **Query the API**: `curl http://localhost:3000/v1/events`
5. **Check stats**: `curl http://localhost:3000/v1/facilitator/stats`

## Next Steps

- Monitor the indexer for real-time events
- Build a frontend that queries the API
- Set up alerts for specific events
- Deploy to production with proper monitoring

