# API Endpoints Documentation

After deploying to Vercel, you'll have two separate API endpoints:

## 1. Facilitator API (for x402 Protocol)

**Base URL**: `https://your-project.vercel.app/api/facilitator`

This API allows you to interact with the Facilitator contract for the x402 protocol.

### Endpoints

#### GET `/api/facilitator/info`
Get contract information.

**Response:**
```json
{
  "contractAddress": "0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7",
  "chainId": "42101",
  "owner": "0x...",
  "totalFacilitated": "0.0",
  "network": "unknown"
}
```

#### POST `/api/facilitator/native-transfer`
Facilitate a native token (PUSH) transfer.

**Request Body:**
```json
{
  "recipient": "0x93974d6642126b1315C8854B9FeF66DbB2A4cc2C",
  "amount": "0.001"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "recipient": "0x...",
  "amount": "0.001",
  "chainId": "42101"
}
```

#### POST `/api/facilitator/token-transfer`
Facilitate an ERC20 token transfer.

**Request Body:**
```json
{
  "token": "0x...",
  "recipient": "0x...",
  "amount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "token": "0x...",
  "recipient": "0x...",
  "amount": "100",
  "chainId": "42101"
}
```

#### POST `/api/facilitator/cross-chain`
Facilitate a cross-chain operation.

**Request Body:**
```json
{
  "target": "0x...",
  "value": "0.001",
  "data": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "target": "0x...",
  "value": "0.001",
  "chainId": "42101"
}
```

## 2. Indexer API (for Querying Transactions)

**Base URL**: `https://your-project.vercel.app/api/indexer`

This API allows you to query indexed transactions and events.

### Endpoints

#### GET `/api/indexer/events`
Get all indexed events with optional filters.

**Query Parameters:**
- `eventName` (optional): Filter by event name
- `fromBlock` (optional): Start block number
- `toBlock` (optional): End block number
- `address` (optional): Filter by sender or target address
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50): Results per page

**Example:**
```
GET /api/indexer/events?address=0x...&page=1&limit=10
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "txHash": "0x...",
      "eventName": "FacilitatedTx",
      "eventArgs": {...},
      "logIndex": 0,
      "blockNumber": 3548471,
      "createdAt": "2025-11-12T19:44:10.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  },
  "filters": {
    "eventName": null,
    "fromBlock": null,
    "toBlock": null,
    "address": "0x..."
  }
}
```

#### GET `/api/indexer/tx`
Get transaction details by hash.

**Query Parameters:**
- `hash` (required): Transaction hash

**Example:**
```
GET /api/indexer/tx?hash=0x...
```

**Response:**
```json
{
  "transaction": {
    "txHash": "0x...",
    "blockNumber": 3548471,
    "blockHash": "0x...",
    "blockTimestamp": "2025-11-12T19:44:10.000Z",
    "sender": "0x...",
    "target": "0x...",
    "facilitator": "0x...",
    "tokenAddress": null,
    "value": "1000000000000000",
    "gasUsed": "21000",
    "gasPrice": "20000000000",
    "status": "confirmed",
    "chainId": 42101,
    "txType": 0,
    "decoded": {...}
  },
  "events": [...]
}
```

#### GET `/api/indexer/stats`
Get statistics about indexed transactions.

**Response:**
```json
{
  "chainId": 42101,
  "totalTransactions": 100,
  "totalVolume": "1000000000000000000",
  "activeUsers": 50,
  "transactionsByType": {
    "native": 60,
    "erc20": 30,
    "cross_chain": 10
  },
  "transactionsByStatus": {
    "confirmed": 95,
    "pending": 5
  },
  "latestBlock": 3548471,
  "timestamp": "2025-11-12T19:44:10.000Z"
}
```

## Usage Examples

### Facilitator API (x402)

```bash
# Get contract info
curl https://your-project.vercel.app/api/facilitator/info

# Native transfer
curl -X POST https://your-project.vercel.app/api/facilitator/native-transfer \
  -H "Content-Type: application/json" \
  -d '{"recipient": "0x...", "amount": "0.001"}'
```

### Indexer API

```bash
# Get all events
curl https://your-project.vercel.app/api/indexer/events

# Get events for address
curl "https://your-project.vercel.app/api/indexer/events?address=0x..."

# Get transaction
curl "https://your-project.vercel.app/api/indexer/tx?hash=0x..."

# Get stats
curl https://your-project.vercel.app/api/indexer/stats
```

## Error Responses

All endpoints return standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (transaction/event not found)
- `405` - Method Not Allowed (wrong HTTP method)
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Error message",
  "message": "Detailed error message (optional)"
}
```

