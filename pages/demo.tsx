import { useState, useEffect } from 'react';
import { createX402Client, X402ClientBuilder, X402Error, X402ErrorCode } from '../packages/x402-sdk/src/index';
import type { AxiosResponse } from 'axios';

interface PaymentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  response?: AxiosResponse;
  error?: string;
  errorCode?: X402ErrorCode;
  txHash?: string;
  timing?: {
    total: number;
    verification: number;
    settlement: number;
    apiProcessing: number;
  };
  paymentStatus?: string;
  facilitatorInfo?: any;
  paymentMethod?: 'server-side' | 'universal-signer' | 'browser-wallet';
  configMethod?: 'standard' | 'builder' | 'preset';
}

export default function Demo() {
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' });
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [useUniversalSigner, setUseUniversalSigner] = useState<boolean>(false);
  const [useBrowserWallet, setUseBrowserWallet] = useState<boolean>(false);
  const [useBuilderPattern, setUseBuilderPattern] = useState<boolean>(false);
  const [useNetworkPreset, setUseNetworkPreset] = useState<boolean>(true);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [ethersAvailable, setEthersAvailable] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [hasEthereum, setHasEthereum] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Set mounted state after hydration to avoid SSR mismatch
  useEffect(() => {
    setIsMounted(true);
    setHasEthereum(typeof window !== 'undefined' && !!(window as any).ethereum);
  }, []);

  // Check if ethers is available (browser-compatible dynamic import)
  useEffect(() => {
    if (isMounted && useBrowserWallet) {
      import('ethers').then((ethersModule) => {
        setEthersAvailable(true);
      }).catch(() => {
        setEthersAvailable(false);
      });
    }
  }, [useBrowserWallet, isMounted]);

  useEffect(() => {
    // Initialize x402 client with new SDK features
    const initClient = async () => {
      let client;
      let configMethod: 'standard' | 'builder' | 'preset' = 'standard';
      
      if (useBrowserWallet && isMounted && hasEthereum && ethersAvailable) {
        // Use browser wallet provider
        try {
          const ethersModule = await import('ethers');
          const ethers = ethersModule.default || ethersModule;
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          
          if (useBuilderPattern) {
            // Use builder pattern
            configMethod = 'builder';
            client = X402ClientBuilder
              .forTestnet()
              .withWallet(provider)
              .withStatusCallback((status: string) => setPaymentStatus(status))
              .withDebug(debugMode)
              .build();
          } else if (useNetworkPreset) {
            // Use network preset
            configMethod = 'preset';
            client = createX402Client({
              network: 'push-testnet', // New: Network preset!
              walletProvider: provider,
              debug: debugMode,
              onPaymentStatus: (status: string) => {
                setPaymentStatus(status);
              },
            });
          } else {
            // Standard config (still works!)
            client = createX402Client({
              walletProvider: provider,
              debug: debugMode,
              onPaymentStatus: (status: string) => {
                setPaymentStatus(status);
              },
            });
          }
          setWalletConnected(true);
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          setWalletConnected(false);
          // Fallback to payment endpoint
          const paymentEndpoint = useUniversalSigner 
            ? '/api/payment/process-universal' 
            : '/api/payment/process';
          
          if (useBuilderPattern) {
            configMethod = 'builder';
            client = X402ClientBuilder
              .forTestnet()
              .withPaymentEndpoint(paymentEndpoint)
              .withStatusCallback((status: string) => setPaymentStatus(status))
              .withDebug(debugMode)
              .build();
          } else if (useNetworkPreset) {
            configMethod = 'preset';
            client = createX402Client({
              network: 'push-testnet',
              paymentEndpoint,
              debug: debugMode,
              onPaymentStatus: (status: string) => {
                setPaymentStatus(status);
              },
            });
          } else {
            client = createX402Client({
              paymentEndpoint,
              debug: debugMode,
              onPaymentStatus: (status: string) => {
                setPaymentStatus(status);
              },
            });
          }
        }
      } else {
        // Use payment endpoint (server-side processing)
        const paymentEndpoint = useUniversalSigner 
          ? '/api/payment/process-universal' 
          : '/api/payment/process';
        
        if (useBuilderPattern) {
          configMethod = 'builder';
          client = X402ClientBuilder
            .forTestnet()
            .withPaymentEndpoint(paymentEndpoint)
            .withStatusCallback((status: string) => setPaymentStatus(status))
            .withDebug(debugMode)
            .build();
        } else if (useNetworkPreset) {
          configMethod = 'preset';
          client = createX402Client({
            network: 'push-testnet', // New: Network preset!
            paymentEndpoint,
            debug: debugMode,
            onPaymentStatus: (status: string) => {
              setPaymentStatus(status);
            },
          });
        } else {
          client = createX402Client({
            paymentEndpoint,
            debug: debugMode,
            onPaymentStatus: (status: string) => {
              setPaymentStatus(status);
            },
          });
        }
        setWalletConnected(false);
      }

      // Store client and config method for use in button click
      if (isMounted) {
        (window as any).x402Client = client;
        (window as any).x402ConfigMethod = configMethod;
      }
    };

    if (isMounted) {
      initClient();
    }
  }, [useUniversalSigner, useBrowserWallet, useBuilderPattern, useNetworkPreset, debugMode, ethersAvailable, isMounted, hasEthereum]);

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

      // Get facilitator info from config (using defaults from SDK)
      const facilitatorInfo = {
        contractAddress: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7', // Default from SDK
        chainId: '42101',
        network: 'push',
      };

      const configMethod = (window as any).x402ConfigMethod || 'standard';

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
        paymentMethod: useBrowserWallet ? 'browser-wallet' : (useUniversalSigner ? 'universal-signer' : 'server-side'),
        configMethod,
      });
      setPaymentStatus('Payment successful!');
    } catch (error: any) {
      console.error('Request error:', error);
      
      // Enhanced error handling with error codes
      let errorMessage = error.message || 'Unknown error occurred';
      let errorCode: X402ErrorCode | undefined;
      
      if (error instanceof X402Error) {
        errorCode = error.code;
        errorMessage = `${error.code}: ${error.message}`;
        if (error.details) {
          console.error('Error details:', error.details);
        }
      }
      
      setPaymentState({
        status: 'error',
        error: errorMessage,
        errorCode,
      });
      setPaymentStatus(`Error: ${errorMessage}`);
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

  const handleComposerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <div className="container">
      {/* Toast Notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#1a1a1a',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'all 0.3s ease-out',
            transform: 'translateX(0)',
            opacity: 1,
          }}
        >
          <span style={{ fontSize: '20px' }}>🚀</span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>Coming Soon</span>
        </div>
      )}
      
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
          <a 
            href="#" 
            onClick={handleComposerClick}
            style={{ color: '#6b7280', textDecoration: 'none', cursor: 'pointer' }}
          >
            Composer
          </a>
          <a href="/demo" style={{ color: '#ec4899', textDecoration: 'none', fontWeight: '500' }}>Demo</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>GitHub</a>
          <a href="https://www.npmjs.com/package/push-x402?activeTab=readme" target="_blank" rel="noopener noreferrer" style={{ color: '#6b7280', textDecoration: 'none' }}>NPM</a>
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
              {!useBrowserWallet && (
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
              )}

              {useBrowserWallet && walletConnected && (
                <div style={{ 
                  padding: '12px', 
                  background: '#dbeafe', 
                  border: '1px solid #93c5fd', 
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#1e40af'
                }}>
                  ✓ Browser wallet connected. SDK uses dynamic imports (browser-compatible).
                  You'll approve transactions in your wallet.
                </div>
              )}

              {/* New SDK Features */}
              <div style={{ 
                padding: '16px', 
                background: '#e0e7ff', 
                border: '1px solid #a5b4fc', 
                borderRadius: '6px',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#3730a3' }}>
                  🆕 New SDK Features
                </h3>
                
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#4c1d95',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={useNetworkPreset}
                    onChange={(e) => setUseNetworkPreset(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong>Use Network Preset</strong>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                      Uses 'push-testnet' preset (simplifies config)
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#4c1d95',
                  marginBottom: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={useBuilderPattern}
                    onChange={(e) => setUseBuilderPattern(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong>Use Builder Pattern</strong>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                      Fluent API: X402ClientBuilder.forTestnet().withWallet().build()
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#4c1d95'
                }}>
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <strong>Debug Mode</strong>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                      Enable detailed logging (check browser console)
                    </div>
                  </div>
                </label>
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
                    checked={useBrowserWallet}
                    onChange={(e) => {
                      setUseBrowserWallet(e.target.checked);
                      if (e.target.checked) {
                        setUseUniversalSigner(false);
                      }
                    }}
                    disabled={!isMounted || !hasEthereum}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: (isMounted && hasEthereum) ? 'pointer' : 'not-allowed',
                      opacity: (isMounted && hasEthereum) ? 1 : 0.5
                    }}
                  />
                  <div>
                    <strong>Use Browser Wallet</strong>
                    <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                      {isMounted && hasEthereum
                        ? 'Test browser-compatible SDK with MetaMask/wallet extension'
                        : 'Wallet extension not detected'}
                    </div>
                  </div>
                </label>
                {useBrowserWallet && isMounted && hasEthereum && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px', 
                    background: '#fef9c3', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#78350f'
                  }}>
                    🌐 Browser wallet mode. SDK uses dynamic imports for browser compatibility.
                    Payments will be processed directly from your wallet.
                  </div>
                )}
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
                    onChange={(e) => {
                      setUseUniversalSigner(e.target.checked);
                      if (e.target.checked) {
                        setUseBrowserWallet(false);
                      }
                    }}
                    disabled={useBrowserWallet}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: useBrowserWallet ? 'not-allowed' : 'pointer',
                      opacity: useBrowserWallet ? 0.5 : 1
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
                  background: paymentState.paymentMethod === 'universal-signer' ? '#dbeafe' : 
                             paymentState.paymentMethod === 'browser-wallet' ? '#d1fae5' : '#f3f4f6',
                  border: `1px solid ${paymentState.paymentMethod === 'universal-signer' ? '#93c5fd' : 
                                  paymentState.paymentMethod === 'browser-wallet' ? '#6ee7b7' : '#d1d5db'}`,
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: paymentState.paymentMethod === 'universal-signer' ? '#1e40af' : 
                         paymentState.paymentMethod === 'browser-wallet' ? '#065f46' : '#374151'
                }}>
                  {paymentState.paymentMethod === 'universal-signer' ? (
                    <>
                      🌐 <strong>Universal Signer</strong> - Multi-chain payment processed using @pushchain/core
                    </>
                  ) : paymentState.paymentMethod === 'browser-wallet' ? (
                    <>
                      🌐 <strong>Browser Wallet</strong> - Payment processed directly from browser wallet using browser-compatible SDK
                    </>
                  ) : (
                    <>
                      ⚡ <strong>Server-Side</strong> - Payment processed using ethers.js
                    </>
                  )}
                </div>
              )}

              {/* Config Method Display */}
              {paymentState.configMethod && (
                <div style={{ 
                  padding: '12px', 
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: '#0c4a6e'
                }}>
                  <strong>Configuration Method:</strong>{' '}
                  {paymentState.configMethod === 'builder' && '🛠️ Builder Pattern'}
                  {paymentState.configMethod === 'preset' && '⚙️ Network Preset'}
                  {paymentState.configMethod === 'standard' && '📝 Standard Config'}
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

              {/* Facilitator Info - Always show on success */}
              {paymentState.facilitatorInfo && (
                <div style={{ 
                  marginTop: '24px',
                  padding: '16px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    marginBottom: '12px', 
                    color: '#0369a1', 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Facilitator Contract
                  </h3>
                  <div style={{ fontSize: '13px', color: '#0c4a6e' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Address:</strong>{' '}
                      <span style={{ 
                        fontFamily: 'Monaco, Menlo, monospace',
                        fontSize: '11px',
                        wordBreak: 'break-all'
                      }}>
                        {paymentState.facilitatorInfo.contractAddress}
                      </span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Chain ID:</strong> {paymentState.facilitatorInfo.chainId}
                    </div>
                    <div>
                      <strong>Network:</strong> {paymentState.facilitatorInfo.network || 'push'}
                    </div>
                  </div>
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
              
              {/* Enhanced Error Display */}
              {paymentState.errorCode && (
                <div style={{ 
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  <div style={{ fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>
                    Error Code: {paymentState.errorCode}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '8px' }}>
                    {paymentState.errorCode === X402ErrorCode.INSUFFICIENT_FUNDS && (
                      <>💡 <strong>Suggestion:</strong> Add funds to your wallet</>
                    )}
                    {paymentState.errorCode === X402ErrorCode.NETWORK_ERROR && (
                      <>💡 <strong>Suggestion:</strong> Check your internet connection</>
                    )}
                    {paymentState.errorCode === X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE && (
                      <>💡 <strong>Suggestion:</strong> Enable browser wallet or use server-side processing</>
                    )}
                    {paymentState.errorCode === X402ErrorCode.TRANSACTION_FAILED && (
                      <>💡 <strong>Suggestion:</strong> Check transaction on explorer, verify gas settings</>
                    )}
                  </div>
                </div>
              )}
              
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

