import { useState, useEffect } from 'react';
import { createX402Client } from '../packages/x402-sdk/src/index';
import type { AxiosResponse } from 'axios';

interface PaymentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  response?: AxiosResponse;
  error?: string;
  txHash?: string;
  timing?: {
    total: number;
    verification: number;
    settlement: number;
    apiProcessing: number;
  };
  paymentStatus?: string;
  facilitatorInfo?: any;
  paymentMethod?: 'server-side' | 'universal-signer';
}

// Hardcoded public facilitator address
const PUBLIC_FACILITATOR_ADDRESS = '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7';
const FACILITATOR_CHAIN_ID = '42101';

export default function Demo() {
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [useUniversalSigner, setUseUniversalSigner] = useState<boolean>(false);

  useEffect(() => {
    // Initialize x402 client
    // Payment endpoint will be determined by useUniversalSigner toggle
    const paymentEndpoint = useUniversalSigner 
      ? '/api/payment/process-universal' 
      : '/api/payment/process';
    
    const client = createX402Client({
      baseURL: typeof window !== 'undefined' ? window.location.origin : '',
      paymentEndpoint,
      facilitatorAddress: PUBLIC_FACILITATOR_ADDRESS,
      chainId: 42101,
      onPaymentStatus: (status: string) => {
        setPaymentStatus(status);
      },
    });

    // Store client for use in button click
    if (typeof window !== 'undefined') {
      (window as any).x402Client = client;
    }
  }, [useUniversalSigner]);

  const handleRequest = async () => {
    setPaymentState({ status: 'loading' });
    setPaymentStatus('Initializing request...');

    try {
      const client = (window as any).x402Client;
      if (!client) {
        throw new Error('x402 client not initialized');
      }

      const startTime = Date.now();
      
      // Make request to protected resource
      const response = await client.get('/api/protected/weather');
      
      const totalTime = Date.now() - startTime;
      const verificationTime = parseInt(response.headers['x-verification-time'] || '0', 10);
      const settlementTime = parseInt(response.headers['x-settlement-time'] || '0', 10);
      const apiProcessingTime = totalTime - verificationTime - settlementTime;

      // Extract transaction hash from payment response header
      // The X-PAYMENT header contains a JSON stringified PaymentProof object
      let txHash: string | undefined;
      const paymentResponseHeader = response.headers['x-payment-response'];
      if (paymentResponseHeader) {
        try {
          // Try parsing as JSON string (the format sent by x402 SDK)
          const paymentProof = typeof paymentResponseHeader === 'string' 
            ? JSON.parse(paymentResponseHeader) 
            : paymentResponseHeader;
          txHash = paymentProof.txHash || paymentProof.transactionHash;
        } catch (e) {
          // If not JSON, try base64 decode
          try {
            const decoded = JSON.parse(atob(paymentResponseHeader));
            txHash = decoded.txHash || decoded.transactionHash;
          } catch {
            // If all else fails, use the header value directly
            txHash = typeof paymentResponseHeader === 'string' ? paymentResponseHeader : undefined;
          }
        }
      }

      // Use hardcoded facilitator info (no API call needed)
      const facilitatorInfo = {
        contractAddress: PUBLIC_FACILITATOR_ADDRESS,
        chainId: FACILITATOR_CHAIN_ID,
        network: 'push',
      };

      setPaymentState({
        status: 'success',
        response,
        timing: {
          total: totalTime,
          verification: verificationTime,
          settlement: settlementTime,
          apiProcessing: apiProcessingTime,
        },
        txHash,
        facilitatorInfo,
        paymentMethod: useUniversalSigner ? 'universal-signer' : 'server-side',
      });
      setPaymentStatus('Payment successful!');
    } catch (error: any) {
      console.error('Request error:', error);
      setPaymentState({
        status: 'error',
        error: error.message || 'Unknown error occurred',
      });
      setPaymentStatus(`Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStartOver = () => {
    setPaymentState({ status: 'idle' });
    setPaymentStatus('');
  };

  const formatHeaders = (headers: Record<string, any>) => {
    return JSON.stringify(headers, null, 2);
  };

  const getExplorerUrl = (txHash: string) => {
    // Push Chain testnet explorer
    return `https://donut.push.network/tx/${txHash}`;
  };

  return (
    <div className="container">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '40px',
        padding: '20px 0',
        borderBottom: '1px solid #fce7f3'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#ec4899' 
          }}>
            X
          </div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>
            Push Chain x402
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Composer</a>
          <a href="/demo" style={{ color: '#ec4899', textDecoration: 'none', fontWeight: '500' }}>Demo</a>
          <a href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Docs</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>GitHub</a>
          <a href="https://www.npmjs.com/package/@pushchain/x402-sdk" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>NPM</a>
        </nav>
      </div>

      {/* Title Section */}
      <div className="title-section">
        <h1>x402 Payment Protocol Demo</h1>
        <p className="subtitle">HTTP 402 on Push Chain Blockchain</p>
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Left Column: API Response Details */}
        <div className="panel">
          <h2>API Response</h2>
          
          {paymentState.status === 'idle' && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <p>Click "Make Request" to test the x402 payment flow</p>
            </div>
          )}

          {paymentState.status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="status-badge pending">
                <span className="status-icon"></span>
                Processing payment...
              </div>
              {paymentStatus && (
                <p style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>
                  {paymentStatus}
                </p>
              )}
            </div>
          )}

          {paymentState.status === 'success' && paymentState.response && (
            <>
              <div className="status-section">
                <div className="info-item">
                  <div className="info-label">STATUS</div>
                  <div className="info-value" style={{ color: '#10b981', fontWeight: '600' }}>
                    {paymentState.response.status} {paymentState.response.statusText}
                  </div>
                </div>

                {paymentState.timing && (
                  <div className="timing-grid">
                    <div className="timing-item">
                      <div className="timing-label">Total</div>
                      <div className="timing-value">{paymentState.timing.total}ms</div>
                    </div>
                    <div className="timing-item">
                      <div className="timing-label">Verification</div>
                      <div className="timing-value">{paymentState.timing.verification}ms</div>
                    </div>
                    <div className="timing-item">
                      <div className="timing-label">Settlement</div>
                      <div className="timing-value">{paymentState.timing.settlement}ms</div>
                    </div>
                    <div className="timing-item">
                      <div className="timing-label">API Processing</div>
                      <div className="timing-value">{paymentState.timing.apiProcessing}ms</div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#ec4899', fontWeight: '600' }}>
                  RESPONSE HEADERS
                </h3>
                <div className="json-viewer">
                  {formatHeaders(paymentState.response.headers)}
                </div>
              </div>
            </>
          )}

          {paymentState.status === 'error' && (
            <div className="status-section">
              <div className="status-badge error">
                <span className="status-icon"></span>
                Error: {paymentState.error}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Payment Status and Request Details */}
        <div className="panel">
          {paymentState.status === 'idle' && (
            <>
              <h2>Ready to Test</h2>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                This demo will test the x402 payment flow by making a request to a protected resource.
                The x402 SDK will automatically handle the payment when a 402 response is received.
              </p>
              <div style={{ 
                padding: '12px', 
                background: '#d1fae5', 
                border: '1px solid #6ee7b7', 
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#065f46'
              }}>
                ✓ Using server-side payment processing with BUYER_PRIVATE_KEY from environment variables.
                No wallet approval needed.
              </div>
              
              <div style={{ 
                padding: '16px', 
                background: '#fef3c7', 
                border: '1px solid #fcd34d', 
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#92400e'
                }}>
                  <input
                    type="checkbox"
                    checked={useUniversalSigner}
                    onChange={(e) => setUseUniversalSigner(e.target.checked)}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <div>
                    <strong>Use Universal Signer</strong>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                      Test multi-chain payment processing with Push Chain Universal Signer
                    </div>
                  </div>
                </label>
                {useUniversalSigner && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    background: '#fef9c3', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#78350f'
                  }}>
                    🌐 Universal Signer mode enabled. Payments will use @pushchain/core for multi-chain support.
                  </div>
                )}
              </div>
              
              <button onClick={handleRequest} style={{ width: '100%' }}>
                Make Request →
              </button>
            </>
          )}

          {paymentState.status === 'loading' && (
            <>
              <h2>Processing Payment</h2>
              <div className="status-badge pending">
                <span className="status-icon"></span>
                Payment in progress...
              </div>
              {paymentStatus && (
                <p style={{ marginTop: '16px', color: '#6b7280' }}>
                  {paymentStatus}
                </p>
              )}
            </>
          )}

          {paymentState.status === 'success' && (
            <>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  background: '#10b981',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </span>
                Payment Successful
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                Payment verified and settled. The protected resource has been delivered.
              </p>
              
              {paymentState.paymentMethod && (
                <div style={{ 
                  padding: '12px', 
                  background: paymentState.paymentMethod === 'universal-signer' ? '#dbeafe' : '#f3f4f6',
                  border: `1px solid ${paymentState.paymentMethod === 'universal-signer' ? '#93c5fd' : '#d1d5db'}`,
                  borderRadius: '6px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  color: paymentState.paymentMethod === 'universal-signer' ? '#1e40af' : '#374151'
                }}>
                  {paymentState.paymentMethod === 'universal-signer' ? (
                    <>
                      🌐 <strong>Universal Signer</strong> - Multi-chain payment processed using @pushchain/core
                    </>
                  ) : (
                    <>
                      ⚡ <strong>Server-Side</strong> - Payment processed using ethers.js
                    </>
                  )}
                </div>
              )}

              {paymentState.txHash && (
                <div className="info-item" style={{ marginBottom: '24px' }}>
                  <div className="info-label">TRANSACTION HASH</div>
                  <div className="info-value" style={{ 
                    fontSize: '14px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    wordBreak: 'break-all',
                    marginTop: '8px'
                  }}>
                    {paymentState.txHash}
                  </div>
                  <a 
                    href={getExplorerUrl(paymentState.txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link"
                    style={{ display: 'inline-block', marginTop: '8px' }}
                  >
                    View on Explorer →
                  </a>
                </div>
              )}

              <button 
                onClick={handleStartOver}
                style={{ 
                  width: '100%',
                  background: '#1a1a1a',
                  color: '#fff',
                  marginTop: '24px'
                }}
              >
                Start Over →
              </button>
            </>
          )}

          {paymentState.status === 'error' && (
            <>
              <h2>Payment Failed</h2>
              <div className="status-badge error">
                <span className="status-icon"></span>
                {paymentState.error}
              </div>
              <button 
                onClick={handleStartOver}
                className="button-secondary"
                style={{ width: '100%', marginTop: '24px' }}
              >
                Try Again
              </button>
            </>
          )}

          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#ec4899', fontWeight: '600' }}>
              REQUEST HEADERS
            </h3>
            <div className="json-viewer">
              {JSON.stringify({
                'X-PAYMENT': paymentState.status === 'success' ? 'Automatically handled by x402Axios' : 'Not sent'
              }, null, 2)}
            </div>
          </div>
        </div>
      </div>

      {/* Facilitator Information Section */}
      {paymentState.status === 'success' && paymentState.facilitatorInfo && (
        <div className="panel" style={{ marginTop: '30px' }}>
          <h2>Facilitator Contract Information</h2>
          
          <div className="status-section">
            <div className="info-item">
              <div className="info-label">Contract Address</div>
              <div className="info-value" style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                {paymentState.facilitatorInfo.contractAddress}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Chain ID</div>
              <div className="info-value">{paymentState.facilitatorInfo.chainId}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Network</div>
              <div className="info-value">{paymentState.facilitatorInfo.network || 'push'}</div>
            </div>
          </div>
        </div>
      )}

      {/* How x402Axios works section */}
      <div className="explanation">
        <h3>How x402Axios works</h3>
        <ol>
          <li>
            <strong>Initial Request:</strong> Tries to access resource (no payment)
          </li>
          <li>
            <strong>402 Response:</strong> Server responds with 402 Payment Required and payment details
          </li>
          <li>
            <strong>Automatic Payment:</strong> x402Axios intercepts the 402, processes payment via facilitator contract
          </li>
          <li>
            <strong>Retry with Proof:</strong> Automatically retries the original request with payment proof in X-Payment header
          </li>
          <li>
            <strong>Resource Delivered:</strong> Server verifies payment and returns the protected resource
          </li>
        </ol>
      </div>
    </div>
  );
}

