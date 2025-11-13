# push-x402

**Drop-in axios replacement that automatically handles HTTP 402 Payment Required responses with blockchain payments.**

Just use it like axios - it automatically handles payments when you hit a protected endpoint!

## Installation

```bash
# Basic installation
npm install push-x402 axios

# If using wallet provider (browser/client-side), also install ethers
npm install push-x402 axios ethers

# For multi-chain support with Universal Signer, also install Push Chain SDK
npm install push-x402 axios ethers @pushchain/core
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
import { createX402Client } from 'push-x402';

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
    // Facilitator address is optional - SDK uses default if not provided
    return res.status(402).json({
      scheme: 'exact',
      amount: '0.001', // Amount in PUSH tokens
      currency: 'PUSH',
      recipient: '0xYourSellerWalletAddress', // Your wallet address
      network: 'push',
      chainId: 42101,
      // facilitator is optional - SDK has default: 0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
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
      network: 'push',
      chainId: 42101,
      // facilitator is optional - SDK uses default
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
  recipient: '0x...',        // Your wallet address (required)
  network: 'push',           // Network name
  chainId: 42101,            // Chain ID
  // facilitator is optional - SDK uses default if not provided
}
```

**Required fields:** `amount`, `currency`, `recipient`, `network`, `chainId`

**Optional fields:** `facilitator` (SDK has default: `0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7`)

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
  
  /**
   * Optional: Buyer's private key for seamless transactions (agents/server-side)
   * ⚠️ WARNING: Only use in secure server-side environments!
   * Never expose private keys in client-side code or public repositories.
   * If provided, transactions will be signed automatically without manual approval.
   * Perfect for automated agents and server-side applications.
   */
  privateKey?: string;
  
  /**
   * Optional: Wallet provider for browser/client-side transactions
   * Accepts ethers.js providers (e.g., window.ethereum from MetaMask)
   * If provided, transactions will prompt user for approval in their wallet.
   * Perfect for browser applications where users have wallet extensions.
   * Requires: npm install ethers
   */
  walletProvider?: any; // ethers.Provider type
  
  /**
   * Optional: Universal Signer from Push Chain SDK for multi-chain support
   * If provided, enables automatic cross-chain transactions across all Push Chain supported networks.
   * Takes priority over walletProvider/privateKey for multi-chain support.
   * Requires: npm install @pushchain/core
   */
  universalSigner?: any; // UniversalSigner type from @pushchain/core
  
  /**
   * Optional: Push Chain RPC URL for Universal Signer chain detection
   * If not provided, will auto-detect from payment requirements or use default Push Chain testnet RPC
   */
  pushChainRpcUrl?: string;
  
  /**
   * Optional: Mapping of chain IDs to RPC URLs for multi-chain support
   * Used for automatic chain detection from payment requirements
   * 
   * @example
   * ```typescript
   * {
   *   '42101': 'https://evm.rpc-testnet-donut-node1.push.org/',
   *   '1': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
   *   '137': 'https://polygon-rpc.com'
   * }
   * ```
   */
  chainRpcMap?: Record<string | number, string>;
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

### Multi-Chain Support with Universal Signer

The SDK now supports **automatic multi-chain transactions** using Push Chain's Universal Signer! This enables seamless payments across all Push Chain supported networks without code changes.

#### Automatic Chain Detection

The SDK automatically detects the target chain from payment requirements:

```typescript
// Server returns 402 with chain information
{
  "amount": "0.001",
  "recipient": "0x...",
  "chainId": 1,  // Ethereum mainnet
  "rpcUrl": "https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"  // Optional
}
```

The SDK will automatically:
1. Detect chain from `chainId` or `rpcUrl` in payment requirements
2. Use Universal Signer if available (enables cross-chain)
3. Fallback to ethers.js for backward compatibility

#### Using Universal Signer

**Option 1: Provide Universal Signer directly**

```typescript
import { PushChain } from '@pushchain/core';
import { ethers } from 'ethers';
import { createX402Client } from 'push-x402';

// Create Universal Signer from ethers signer
const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
const ethersSigner = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

// Use Universal Signer in SDK
const client = createX402Client({
  universalSigner,
  baseURL: 'https://api.example.com',
});

// Payments will work across all Push Chain supported networks!
const response = await client.get('/protected/resource');
```

**Option 2: Auto-create from wallet provider**

```typescript
import { ethers } from 'ethers';
import { createX402Client } from 'push-x402';

const provider = new ethers.BrowserProvider(window.ethereum);
const client = createX402Client({
  walletProvider: provider,
  // SDK will automatically create Universal Signer if @pushchain/core is installed
  baseURL: 'https://api.example.com',
});

// Multi-chain payments work automatically!
const response = await client.get('/protected/resource');
```

**Option 3: Configure chain RPC mapping**

```typescript
const client = createX402Client({
  walletProvider: provider,
  chainRpcMap: {
    '42101': 'https://evm.rpc-testnet-donut-node1.push.org/',  // Push Chain testnet
    '1': 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',       // Ethereum
    '137': 'https://polygon-rpc.com',                           // Polygon
  },
  baseURL: 'https://api.example.com',
});

// SDK automatically selects the correct RPC based on payment requirements
```

#### Chain Detection Priority

The SDK detects chains in this order:
1. `rpcUrl` from payment requirements (highest priority)
2. `chainId` from payment requirements + `chainRpcMap` config
3. `pushChainRpcUrl` config option
4. `chainId` from payment requirements (uses default Push Chain RPC)
5. `chainId` config option
6. Default: Push Chain testnet (42101)

### Payment Options: Choose What Works for You

The SDK supports **four payment methods** - choose based on your use case:

#### Option 1: Universal Signer (Multi-Chain) 🌐

Perfect for multi-chain applications. Works across all Push Chain supported networks automatically.

```typescript
import { PushChain } from '@pushchain/core';
import { ethers } from 'ethers';
import { createX402Client } from 'push-x402';

// Create Universal Signer
const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
const ethersSigner = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

const client = createX402Client({
  universalSigner,
  baseURL: 'https://api.example.com',
});

// Works across all chains automatically!
const response = await client.get('/protected/resource');
```

**Use Cases:**
- ✅ Multi-chain applications
- ✅ Cross-chain payments
- ✅ Universal dApps
- ✅ Push Chain ecosystem

**Requirements:**
- Install `@pushchain/core`: `npm install @pushchain/core`

#### Option 2: Private Key (Agents/Server-Side) ⚡

Perfect for automated agents and server-side applications. Transactions are signed automatically.

```typescript
// ⚠️ WARNING: Only use private keys in secure server-side environments!
// Never expose private keys in client-side code or public repositories.

const client = createX402Client({
  baseURL: 'https://api.example.com',
  privateKey: process.env.BUYER_PRIVATE_KEY, // From environment variable
  onPaymentStatus: (status) => {
    console.log('Payment:', status);
  },
});

// Transactions happen automatically - perfect for agents!
const response = await client.get('/protected/resource');
```

**Use Cases:**
- ✅ Automated agents and bots
- ✅ Server-side applications (Node.js, API routes)
- ✅ Background jobs and scheduled tasks
- ✅ Testing and development

**Security:**
- ✅ Always use environment variables
- ✅ Never commit private keys to git
- ✅ Use HTTPS only

#### Option 3: Wallet Provider (Browser/Client-Side) 🔐

Perfect for browser applications. Users approve transactions in their wallet (MetaMask, WalletConnect, etc.).

```typescript
import { ethers } from 'ethers';
import { createX402Client } from 'push-x402';

// Connect to user's wallet (MetaMask, etc.)
const provider = new ethers.BrowserProvider(window.ethereum);
const client = createX402Client({
  baseURL: 'https://api.example.com',
  walletProvider: provider, // User's wallet provider
  onPaymentStatus: (status) => {
    console.log('Payment:', status);
  },
});

// User will be prompted to approve transaction in their wallet
const response = await client.get('/protected/resource');
```

**Use Cases:**
- ✅ Browser applications (React, Vue, etc.)
- ✅ User-facing web apps
- ✅ DApps and DeFi applications
- ✅ When users want wallet control

**Requirements:**
- Install ethers: `npm install ethers`
- User must have a wallet extension (MetaMask, etc.)

#### Option 4: Public Endpoint (Server-Side Setup)

Use the public facilitator endpoint with your own server-side private key setup.

```typescript
// No private key or wallet provider needed
// Your server must have BUYER_PRIVATE_KEY environment variable set
const client = createX402Client({
  baseURL: 'https://api.example.com',
});

const response = await client.get('/protected/resource');
```

**Use Cases:**
- ✅ When you've set up your own payment processor
- ✅ Server-side with environment variables
- ✅ Shared payment infrastructure

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
