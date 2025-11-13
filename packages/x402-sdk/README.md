# push-x402

**Drop-in axios replacement that automatically handles HTTP 402 Payment Required responses with blockchain payments.**

Just use it like axios - it automatically handles payments when you hit a protected endpoint!

## Installation

```bash
npm install push-x402 axios
```

## Quick Start

### For Buyers: Using the SDK

**That's it!** No configuration needed. The SDK uses the public facilitator API by default.

```typescript
import { createX402Client } from 'push-x402';

// Create client (works exactly like axios)
const client = createX402Client();

// Make requests to protected endpoints - payments are handled automatically!
const response = await client.get('https://api.example.com/protected/resource');
console.log(response.data);
```

### Complete Example

```typescript
import { createX402Client } from 'push-x402';

// Option 1: Use full URLs
const client = createX402Client();
const response = await client.get('https://api.example.com/protected/resource');

// Option 2: Use base URL (like axios)
const client = createX402Client({
  baseURL: 'https://api.example.com',
});
const response = await client.get('/protected/resource');

// Option 3: With payment status updates
const client = createX402Client({
  baseURL: 'https://api.example.com',
  onPaymentStatus: (status) => {
    console.log('Payment:', status);
    // Update UI: "Processing payment...", "Payment complete", etc.
  },
});

// All HTTP methods work!
await client.get('/api/resource');
await client.post('/api/resource', { data: 'value' });
await client.put('/api/resource', { data: 'value' });
await client.delete('/api/resource');
await client.patch('/api/resource', { data: 'value' });
```

### React Example

```typescript
import { useState } from 'react';
import { createX402Client } from '@pushchain/x402-sdk';

function MyComponent() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Ready');

  const client = createX402Client({
    baseURL: 'https://api.example.com',
    onPaymentStatus: (statusText) => {
      setStatus(statusText);
    },
  });

  const fetchData = async () => {
    try {
      setStatus('Loading...');
      const response = await client.get('/protected/resource');
      setData(response.data);
      setStatus('Success!');
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch Protected Data</button>
      <p>Status: {status}</p>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

---

## For Sellers: Creating Protected Endpoints

As a seller, create endpoints that return `402 Payment Required` when no payment is provided.

### Next.js API Route

```typescript
// pages/api/protected/resource.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check for payment header
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    // Return 402 Payment Required
    return res.status(402).json({
      scheme: 'exact',
      amount: '0.001', // Amount in PUSH tokens
      currency: 'PUSH',
      recipient: '0xYourSellerWalletAddress', // Your wallet address
      facilitator: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
      network: 'push',
      chainId: 42101,
    });
  }

  // Payment provided - return protected resource
  return res.status(200).json({
    success: true,
    data: {
      message: 'This is protected content',
      timestamp: new Date().toISOString(),
    },
  });
}
```

### Express.js

```typescript
app.get('/api/protected/resource', (req, res) => {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    return res.status(402).json({
      scheme: 'exact',
      amount: '0.001',
      currency: 'PUSH',
      recipient: '0xYourSellerWalletAddress',
      facilitator: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
      network: 'push',
      chainId: 42101,
    });
  }

  res.json({ success: true, data: { /* your data */ } });
});
```

### Payment Requirements Format

Your 402 response must include:

```typescript
{
  scheme: 'exact',           // Payment scheme
  amount: '0.001',           // Amount as string
  currency: 'PUSH',          // Currency name
  recipient: '0x...',        // Your wallet address
  facilitator: '0x...',      // Facilitator contract (optional, SDK has default)
  network: 'push',           // Network name
  chainId: 42101,            // Chain ID
}
```

**Alternative field names** (SDK supports both):
- `amount` or `maxAmountRequired`
- `currency` or `asset`
- `recipient` or `payTo`

---

## Configuration

All configuration is **optional** - the SDK works out of the box with sensible defaults!

```typescript
interface X402ClientConfig {
  /**
   * Optional: Base URL for API calls
   * If not provided, use full URLs in requests
   */
  baseURL?: string;
  
  /**
   * Optional: Custom axios request config
   * Merged with default axios instance config
   */
  axiosConfig?: AxiosRequestConfig;
  
  /**
   * Optional: Callback for payment status updates
   * Called with status messages during payment processing
   */
  onPaymentStatus?: (status: string) => void;
  
  /**
   * Optional: Override public facilitator API endpoint
   * Default: https://pushindexer.vercel.app/api/payment/process
   */
  paymentEndpoint?: string;
  
  /**
   * Optional: Facilitator contract address
   * Default: 0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
   */
  facilitatorAddress?: string;
  
  /**
   * Optional: Chain ID
   * Default: 42101 (Push Chain testnet)
   */
  chainId?: number | string;
}
```

### Defaults

The SDK uses these defaults (no configuration needed):

- **Payment Endpoint**: `https://pushindexer.vercel.app/api/payment/process`
- **Facilitator Address**: `0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7`
- **Chain ID**: `42101` (Push Chain testnet)

---

## How It Works

1. **You make a request** to a protected API endpoint (just like axios)
2. **Server responds with 402** Payment Required and payment requirements
3. **SDK automatically**:
   - Detects the 402 response
   - Validates payment requirements
   - Calls the public facilitator API to process payment
   - Creates payment proof with transaction hash
   - Retries your original request with payment proof
4. **Server verifies payment** and returns the protected resource

**You don't need to do anything** - it's all automatic! 🎉

---

## Error Handling

The SDK includes robust error handling:

- ✅ **Validation**: Validates payment requirements before processing
- ✅ **Retry Protection**: Prevents infinite loops (max 1 retry per request)
- ✅ **Timeout**: 60-second timeout for blockchain transactions
- ✅ **Clear Errors**: Descriptive error messages for debugging
- ✅ **Status Updates**: Real-time payment status via `onPaymentStatus` callback

### Error Examples

```typescript
try {
  const response = await client.get('/protected/resource');
} catch (error: any) {
  if (error.message.includes('Payment Processing Failed')) {
    // Payment failed - show user-friendly message
    console.error('Payment failed:', error.message);
  } else {
    // Other errors (network, 404, etc.)
    console.error('Request failed:', error.message);
  }
}
```

---

## Browser and Node.js Support

Works everywhere axios works! ✅

- ✅ **Browser**: React, Vue, Angular, vanilla JS, etc.
- ✅ **Node.js**: Express, Fastify, Next.js, etc.
- ✅ **TypeScript**: Full type support
- ✅ **ESM & CommonJS**: Both module formats supported

---

## Advanced Usage

### Custom Payment Endpoint

If you have your own payment processor:

```typescript
const client = createX402Client({
  paymentEndpoint: 'https://your-api.com/api/payment/process',
});
```

### Custom Axios Config

```typescript
const client = createX402Client({
  baseURL: 'https://api.example.com',
  axiosConfig: {
    timeout: 10000,
    headers: {
      'Authorization': 'Bearer token',
    },
  },
});
```

### Payment Status Callback

```typescript
const client = createX402Client({
  onPaymentStatus: (status) => {
    // Update UI based on status
    switch (true) {
      case status.includes('Payment required'):
        showPaymentModal();
        break;
      case status.includes('Processing payment'):
        showLoadingSpinner();
        break;
      case status.includes('Payment failed'):
        showError(status);
        break;
      default:
        console.log(status);
    }
  },
});
```

---

## Best Practices

### For Buyers

1. ✅ **Use baseURL** for cleaner code
2. ✅ **Handle errors gracefully** - show user-friendly messages
3. ✅ **Use payment status callback** for better UX
4. ✅ **Don't expose private keys** - payment processing is server-side

### For Sellers

1. ✅ **Always verify payments** in production (check transaction on-chain)
2. ✅ **Use exact amounts** to prevent overpayment
3. ✅ **Include all required fields** in 402 responses
4. ✅ **Handle CORS** properly for browser clients
5. ✅ **Log transactions** for auditing

---

## Troubleshooting

### Payment Processing Fails

- ✅ Check that the public facilitator API is accessible
- ✅ Verify your wallet has sufficient balance
- ✅ Check network connectivity

### 402 Response Not Handled

- ✅ Verify response status code is exactly 402
- ✅ Check that payment requirements include `recipient` and `amount`
- ✅ Ensure response is valid JSON

### Infinite Retry Loop

- ✅ SDK automatically prevents this (max 1 retry)
- ✅ Check that payment processor returns valid transaction hash

---

## API Reference

### `createX402Client(config?)`

Creates an axios instance with x402 payment interceptor.

**Parameters:**
- `config` (optional): `X402ClientConfig` - Configuration object

**Returns:**
- `AxiosInstance` - Axios instance (use it exactly like axios!)

**Example:**
```typescript
const client = createX402Client();
const response = await client.get('https://api.example.com/resource');
```

---

## License

MIT
