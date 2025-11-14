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

The SDK calls the facilitator contract directly - no serverless API required! Choose your payment method:

**Option 1: Browser with Wallet (Recommended for client-side)**
```typescript
import { ethers } from 'ethers';
import { createX402Client } from 'push-x402';

// Connect to user's wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const client = createX402Client({
  walletProvider: provider,
});

// Make requests - user will approve transactions in their wallet
const response = await client.get('https://api.example.com/protected/resource');
console.log(response.data);
```

**Option 2: Server-side with Private Key (Recommended for agents)**
```typescript
import { createX402Client } from 'push-x402';

// ⚠️ Only use in secure server-side environments!
const client = createX402Client({
  privateKey: process.env.PRIVATE_KEY, // Calls facilitator contract directly
});

// Transactions happen automatically - perfect for agents!
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

## New Features: Simplified Configuration

The SDK now supports multiple ways to configure it, making it much easier to use:

### 1. Environment Variables (Recommended for Production)

Set environment variables and the SDK will automatically use them:

```bash
# .env file or environment variables
PUSH_X402_FACILITATOR_ADDRESS=0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7
PUSH_X402_CHAIN_ID=42101
PUSH_X402_RPC_URL=https://evm.rpc-testnet-donut-node1.push.org/
PUSH_X402_PRIVATE_KEY=your_private_key_here  # Server-side only!
```

```typescript
import { createX402Client } from 'push-x402';

// SDK automatically reads from environment variables
const client = createX402Client({
  walletProvider: provider, // Only payment method needs to be provided
});

// Or with private key (server-side)
const client = createX402Client({
  // privateKey is read from PUSH_X402_PRIVATE_KEY automatically
});
```

### 2. Network Presets

Use preset configurations for common networks:

```typescript
import { createX402Client } from 'push-x402';

// Push Chain testnet (default)
const client = createX402Client({
  network: 'push-testnet',
  walletProvider: provider,
});

// Push Chain mainnet
const client = createX402Client({
  network: 'push-mainnet',
  walletProvider: provider,
});
```

### 3. Builder Pattern (Fluent API)

Use the builder pattern for a more readable configuration:

```typescript
import { X402ClientBuilder } from 'push-x402';

// Fluent API - much more readable!
const client = X402ClientBuilder
  .forTestnet()
  .withWallet(provider)
  .withStatusCallback((status) => console.log(status))
  .withBaseURL('https://api.example.com')
  .withDebug(true)
  .build();

// Or for mainnet
const client = X402ClientBuilder
  .forMainnet()
  .withPrivateKey(process.env.PRIVATE_KEY)
  .build();
```

### 4. Debug Mode

Enable detailed logging to see exactly what's happening:

```typescript
const client = createX402Client({
  walletProvider: provider,
  debug: true, // Enable debug logging
});

// Or with builder
const client = X402ClientBuilder
  .forTestnet()
  .withWallet(provider)
  .withDebug(true)
  .build();
```

Debug mode logs:
- Client creation details
- 402 response detection
- Payment requirements validation
- Payment processing steps
- Transaction details
- Retry attempts
- Error details with error codes

### 5. Enhanced Error Handling

The SDK now provides structured errors with error codes:

```typescript
import { X402Error, X402ErrorCode } from 'push-x402';

try {
  const response = await client.get('/protected/resource');
} catch (error) {
  if (error instanceof X402Error) {
    switch (error.code) {
      case X402ErrorCode.PAYMENT_REQUIRED:
        // Handle payment required
        break;
      case X402ErrorCode.INSUFFICIENT_FUNDS:
        // Handle insufficient funds
        console.error('Please add funds to your wallet');
        break;
      case X402ErrorCode.PAYMENT_FAILED:
        // Handle payment failure
        break;
      case X402ErrorCode.NETWORK_ERROR:
        // Handle network issues
        break;
      default:
        console.error('Payment error:', error.message);
    }
  }
}
```

**Error Codes:**
- `PAYMENT_REQUIRED` - 402 response received
- `INSUFFICIENT_FUNDS` - Wallet doesn't have enough balance
- `PAYMENT_FAILED` - Payment processing failed
- `INVALID_PAYMENT_REQUIREMENTS` - Invalid 402 response format
- `PAYMENT_METHOD_NOT_AVAILABLE` - No payment method configured
- `TRANSACTION_FAILED` - Blockchain transaction failed
- `NETWORK_ERROR` - Network connectivity issue
- `MAX_RETRIES_EXCEEDED` - Maximum retry attempts reached
- `UNKNOWN_ERROR` - Unexpected error

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
   * Optional: Custom payment endpoint for server-side processing
   * If not provided, SDK will use direct facilitator contract calls (walletProvider/privateKey/universalSigner)
   * Only use this if you have your own payment processing server
   * 
   * @example
   * ```typescript
   * // Use your own server endpoint
   * const client = createX402Client({ 
   *   paymentEndpoint: 'https://your-server.com/api/payment/process' 
   * });
   * ```
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
   * Optional: Network preset ('push-testnet' or 'push-mainnet')
   * When provided, automatically sets facilitatorAddress, chainId, and pushChainRpcUrl
   * Can be overridden by explicit config values
   */
  network?: 'push-testnet' | 'push-mainnet';

  /**
   * Optional: Wallet provider for browser/client-side transactions
   * Accepts ethers.js providers (e.g., window.ethereum from MetaMask)
   * If provided, transactions will prompt user for approval in their wallet.
   * Perfect for browser applications where users have wallet extensions.
   * Requires: npm install ethers
   */
  walletProvider?: WalletProvider;
  
  /**
   * Optional: Universal Signer from Push Chain SDK for multi-chain support
   * If provided, enables automatic cross-chain transactions across all Push Chain supported networks.
   * Takes priority over walletProvider/privateKey for multi-chain support.
   * Requires: npm install @pushchain/core
   */
  universalSigner?: UniversalSigner;

  /**
   * Optional: Enable debug mode for detailed logging
   * When enabled, logs all payment flow steps, timing information, and transaction details
   */
  debug?: boolean;
  
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

The SDK uses these defaults:

- **Facilitator Address**: `0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7` (Push Chain facilitator contract)
- **Chain ID**: `42101` (Push Chain testnet)
- **Payment Endpoint**: None (SDK calls facilitator contract directly)
- **Base URL**: Auto-detected in browser (`window.location.origin`)

**Note:** You must provide one of: `walletProvider`, `privateKey`, `universalSigner`, or `paymentEndpoint` for payments to work.

### Environment Variables

The SDK automatically reads from these environment variables (if set):

- `PUSH_X402_FACILITATOR_ADDRESS` - Facilitator contract address
- `PUSH_X402_CHAIN_ID` - Chain ID (number)
- `PUSH_X402_RPC_URL` - Push Chain RPC URL
- `PUSH_X402_PRIVATE_KEY` - Private key for server-side payments (⚠️ server-side only!)

Environment variables are merged with provided config, with explicit config taking priority.

---

## How It Works

1. **You make a request** to a protected API endpoint (just like axios)
2. **Server responds with 402** Payment Required and payment requirements
3. **SDK automatically**:
   - Detects the 402 response
   - Validates payment requirements
   - **Calls the facilitator contract directly** (no serverless API needed!)
   - Creates payment proof with transaction hash
   - Retries your original request with payment proof
4. **Server verifies payment** and returns the protected resource

**The SDK calls the facilitator contract on-chain directly** - no intermediate API layer required!

---

## Error Handling

The SDK includes robust error handling:

- **Validation**: Validates payment requirements before processing
- **Retry Protection**: Prevents infinite loops (max 1 retry per request)
- **Timeout**: 60-second timeout for blockchain transactions
- **Structured Errors**: Error codes for programmatic error handling
- **Clear Messages**: Descriptive error messages for debugging
- **Status Updates**: Real-time payment status via `onPaymentStatus` callback

### Error Handling Examples

**Basic Error Handling:**
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

**Advanced Error Handling with Error Codes:**
```typescript
import { X402Error, X402ErrorCode } from 'push-x402';

try {
  const response = await client.get('/protected/resource');
} catch (error) {
  if (error instanceof X402Error) {
    switch (error.code) {
      case X402ErrorCode.INSUFFICIENT_FUNDS:
        alert('Please add funds to your wallet');
        break;
      case X402ErrorCode.NETWORK_ERROR:
        alert('Network error. Please check your connection.');
        break;
      case X402ErrorCode.PAYMENT_FAILED:
        console.error('Payment failed:', error.message);
        console.error('Details:', error.details);
        break;
      default:
        console.error('Payment error:', error.code, error.message);
    }
  } else {
    // Non-payment errors
    console.error('Request failed:', error.message);
  }
}
```

### Error Codes Reference

| Code | Description | Suggested Action |
|------|-------------|------------------|
| `PAYMENT_REQUIRED` | 402 response received | Payment will be processed automatically |
| `INSUFFICIENT_FUNDS` | Wallet balance too low | Ask user to add funds |
| `PAYMENT_FAILED` | Payment processing failed | Check error details, retry if appropriate |
| `INVALID_PAYMENT_REQUIREMENTS` | Invalid 402 response format | Check server implementation |
| `PAYMENT_METHOD_NOT_AVAILABLE` | No payment method configured | Provide walletProvider, privateKey, or paymentEndpoint |
| `TRANSACTION_FAILED` | Blockchain transaction failed | Check transaction on explorer, verify gas |
| `NETWORK_ERROR` | Network connectivity issue | Check internet connection, RPC endpoint |
| `MAX_RETRIES_EXCEEDED` | Too many retry attempts | Investigate why payment keeps failing |
| `UNKNOWN_ERROR` | Unexpected error | Check error details, report if needed |

---

## Browser and Node.js Support

Works everywhere axios works!

- **Browser**: React, Vue, Angular, vanilla JS, etc.
- **Node.js**: Express, Fastify, Next.js, etc.
- **TypeScript**: Full type support
- **ESM & CommonJS**: Both module formats supported

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

#### Option 1: Universal Signer (Multi-Chain)

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
- Multi-chain applications
- Cross-chain payments
- Universal dApps
- Push Chain ecosystem

**Requirements:**
- Install `@pushchain/core`: `npm install @pushchain/core`

#### Option 2: Private Key (Agents/Server-Side)

Perfect for automated agents and server-side applications. **Calls facilitator contract directly** - no API needed!

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

// SDK calls facilitator contract directly - transactions happen automatically!
const response = await client.get('/protected/resource');
```

**Use Cases:**
- Automated agents and bots
- Server-side applications (Node.js, API routes)
- Background jobs and scheduled tasks
- Testing and development

**How it works:**
- SDK creates wallet from private key
- Calls facilitator contract `facilitateNativeTransfer()` directly
- No serverless API dependency
- Works completely offline (just needs RPC connection)

**Security:**
- Always use environment variables
- Never commit private keys to git
- Use HTTPS only

#### Option 3: Wallet Provider (Browser/Client-Side)

Perfect for browser applications. **Calls facilitator contract directly** - users approve transactions in their wallet.

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

// SDK calls facilitator contract directly - user approves in wallet
const response = await client.get('/protected/resource');
```

**Use Cases:**
- Browser applications (React, Vue, etc.)
- User-facing web apps
- DApps and DeFi applications
- When users want wallet control

**How it works:**
- SDK gets signer from wallet provider
- Calls facilitator contract `facilitateNativeTransfer()` directly
- User approves transaction in their wallet
- No serverless API dependency

**Requirements:**
- Install ethers: `npm install ethers`
- User must have a wallet extension (MetaMask, etc.)

#### Option 4: Custom Payment Endpoint (Optional)

Only use this if you have your own payment processing server. Otherwise, use direct contract calls (Options 1-3).

```typescript
// Use your own payment processing endpoint
const client = createX402Client({
  baseURL: 'https://api.example.com',
  paymentEndpoint: 'https://your-server.com/api/payment/process',
});

const response = await client.get('/protected/resource');
```

**Use Cases:**
- When you have your own payment processing server
- Custom payment infrastructure
- Legacy systems integration

**Note:** Direct facilitator contract calls (Options 1-3) are recommended - no serverless dependency!

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

1. **Use baseURL** for cleaner code
2. **Handle errors gracefully** - show user-friendly messages
3. **Use payment status callback** for better UX
4. **Choose the right payment method**:
   - Browser apps → `walletProvider`
   - Server-side/agents → `privateKey`
   - Multi-chain → `universalSigner`
5. **Don't expose private keys** - only use in secure server-side environments
6. **Use environment variables** for production configuration
7. **Enable debug mode** during development for troubleshooting

### For Sellers

1. **Always verify payments** in production (check transaction on-chain)
2. **Use exact amounts** to prevent overpayment
3. **Include all required fields** in 402 responses
4. **Handle CORS** properly for browser clients
5. **Log transactions** for auditing

---

## Troubleshooting

### Payment Processing Fails

- Verify you provided one of: `walletProvider`, `privateKey`, `universalSigner`, or `paymentEndpoint`
- Check that ethers.js is installed if using `walletProvider` or `privateKey`
- Verify your wallet has sufficient balance
- Check network connectivity and RPC endpoint
- Ensure facilitator contract address is correct
- Enable debug mode to see detailed error information

### 402 Response Not Handled

- Verify response status code is exactly 402
- Check that payment requirements include `recipient` and `amount`
- Ensure response is valid JSON

### Infinite Retry Loop

- SDK automatically prevents this (max 1 retry)
- Check that payment processor returns valid transaction hash

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

### `X402ClientBuilder`

Builder class for creating x402 clients with a fluent API.

**Static Methods:**
- `X402ClientBuilder.forTestnet()` - Create builder for Push Chain testnet
- `X402ClientBuilder.forMainnet()` - Create builder for Push Chain mainnet
- `X402ClientBuilder.forNetwork(network)` - Create builder for specific network
- `X402ClientBuilder.withConfig(config)` - Create builder with custom config

**Instance Methods:**
- `.withWallet(provider)` - Set wallet provider
- `.withPrivateKey(key)` - Set private key (server-side)
- `.withUniversalSigner(signer)` - Set Universal Signer
- `.withStatusCallback(callback)` - Set payment status callback
- `.withBaseURL(url)` - Set base URL
- `.withFacilitatorAddress(address)` - Set facilitator address
- `.withChainId(id)` - Set chain ID
- `.withRpcUrl(url)` - Set RPC URL
- `.withChainRpcMap(map)` - Set chain RPC mapping
- `.withPaymentEndpoint(endpoint)` - Set payment endpoint
- `.withDebug(enabled)` - Enable/disable debug mode
- `.withAxiosConfig(config)` - Set custom axios config
- `.build()` - Build and return the configured client

**Example:**
```typescript
import { X402ClientBuilder } from 'push-x402';

const client = X402ClientBuilder
  .forTestnet()
  .withWallet(provider)
  .withStatusCallback((status) => console.log(status))
  .withDebug(true)
  .build();
```

### `getPresetConfig(network)`

Get preset configuration for a network.

**Parameters:**
- `network`: `'push-testnet' | 'push-mainnet'` - Network preset name

**Returns:**
- `Partial<X402ClientConfig>` - Partial configuration object

**Example:**
```typescript
import { getPresetConfig } from 'push-x402';

const testnetConfig = getPresetConfig('push-testnet');
const client = createX402Client({
  ...testnetConfig,
  walletProvider: provider,
});
```

### `createConfig(userConfig?)`

Create a configuration object with sensible defaults and environment variable support.

**Parameters:**
- `userConfig` (optional): `X402ClientConfig` - User configuration

**Returns:**
- `X402ClientConfig` - Merged configuration object

**Example:**
```typescript
import { createConfig } from 'push-x402';

const config = createConfig({
  walletProvider: provider,
});
const client = createX402Client(config);
```

### `X402Error`

Enhanced error class for x402 payment processing.

**Properties:**
- `code`: `X402ErrorCode` - Error code
- `message`: `string` - Error message
- `details`: `any` - Additional error details
- `response`: `any` - Axios response (if available)
- `request`: `any` - Axios request (if available)

**Static Methods:**
- `X402Error.fromError(error, code?)` - Create X402Error from existing error

**Example:**
```typescript
import { X402Error, X402ErrorCode } from 'push-x402';

try {
  await client.get('/protected/resource');
} catch (error) {
  if (error instanceof X402Error) {
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  }
}
```

---

## License

MIT
