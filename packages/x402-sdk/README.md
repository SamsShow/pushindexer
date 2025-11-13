# @pushchain/x402-sdk

x402 Payment Protocol SDK for Push Chain - Automatically handle HTTP 402 Payment Required responses with blockchain payments.

## Installation

```bash
npm install @pushchain/x402-sdk axios
```

## Usage

### Basic Example

```typescript
import { createX402Client } from '@pushchain/x402-sdk';

const client = createX402Client({
  paymentEndpoint: 'https://api.example.com/api/payment/process',
  facilitatorAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
  chainId: 42101,
});

// Automatically handles 402 responses
const response = await client.get('https://api.example.com/protected/resource');
console.log(response.data);
```

### With Status Callbacks

```typescript
const client = createX402Client({
  paymentEndpoint: 'https://api.example.com/api/payment/process',
  facilitatorAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
  chainId: 42101,
  onPaymentStatus: (status) => {
    console.log('Payment status:', status);
  },
});
```

### All HTTP Methods Supported

```typescript
// GET request
const getResponse = await client.get('/api/resource');

// POST request
const postResponse = await client.post('/api/resource', { data: 'value' });

// PUT request
const putResponse = await client.put('/api/resource', { data: 'value' });

// DELETE request
const deleteResponse = await client.delete('/api/resource');
```

## Configuration

### X402ClientConfig

```typescript
interface X402ClientConfig {
  // Required: Endpoint for processing payments
  paymentEndpoint: string;
  
  // Optional: Facilitator contract address
  facilitatorAddress?: string;
  
  // Optional: Chain ID (default: 42101)
  chainId?: number | string;
  
  // Optional: Base URL for API calls
  baseURL?: string;
  
  // Optional: Custom axios config
  axiosConfig?: AxiosRequestConfig;
  
  // Optional: Payment status callback
  onPaymentStatus?: (status: string) => void;
}
```

## How It Works

1. Client makes a request to a protected API endpoint
2. Server responds with `402 Payment Required` and payment requirements
3. SDK automatically:
   - Extracts payment requirements from 402 response
   - Calls your payment processor endpoint
   - Creates payment proof with transaction hash
   - Retries original request with `X-PAYMENT` header
4. Server verifies payment and returns the protected resource

## Browser and Node.js Support

This SDK works in both browser and Node.js environments. Just ensure `axios` is installed as a peer dependency.

## License

MIT

