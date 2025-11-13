import { useState, useEffect } from 'react';
import Head from 'next/head';
import { createX402Client } from '@pushchain/x402-sdk';

// Use relative path for facilitator API

export default function Demo() {
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: 'pending', text: 'Ready to Test' });
  const [statusCode, setStatusCode] = useState<string>('-');
  const [totalTime, setTotalTime] = useState<string>('-');
  const [verificationTime, setVerificationTime] = useState<string>('-');
  const [settlementTime, setSettlementTime] = useState<string>('-');
  const [apiTime, setApiTime] = useState<string>('-');
  const [responseHeaders, setResponseHeaders] = useState<string>('-');
  const [requestHeaders, setRequestHeaders] = useState<string>('-');
  const [txHash, setTxHash] = useState<string>('-');
  const [paymentStatus, setPaymentStatus] = useState<{ type: string; text: string }>({ type: 'pending', text: 'Waiting for request...' });
  const [indexedData, setIndexedData] = useState<any>(null);
  const [showIndexedData, setShowIndexedData] = useState(false);
  const [indexerLoading, setIndexerLoading] = useState(false);
  const [facilitatorInfo, setFacilitatorInfo] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';
  const PROTECTED_ENDPOINT = `${API_BASE}/api/demo/protected`;
  const INDEXER_API = `${API_BASE}/api/indexer`;
  const FACILITATOR_API = `${API_BASE}/api/facilitator`;

  // Initialize facilitator info
  useEffect(() => {
    fetch(`${FACILITATOR_API}/info`)
      .then(res => res.json())
      .then(data => setFacilitatorInfo(data))
      .catch(console.error);
  }, []);

  const fetchIndexedData = async (txHash: string, retryCount = 0) => {
    if (!txHash || txHash === '-') return;
    
    // Don't retry more than 5 times
    if (retryCount > 5) {
      setIndexerLoading(false);
      setIndexedData({ error: 'Transaction not found or indexer unavailable after multiple retries' });
      return;
    }
    
    setIndexerLoading(true);
    try {
      const response = await fetch(`${INDEXER_API}/tx?hash=${txHash}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
      
      if (response.ok) {
        const data = await response.json();
        setIndexedData(data);
        setShowIndexedData(true);
        setIndexerLoading(false);
      } else if (response.status === 404) {
        // Transaction not found - API will try on-demand indexing on first request
        // Retry once to trigger on-demand indexing
        if (retryCount === 0) {
          // First retry triggers on-demand indexing
          setTimeout(() => fetchIndexedData(txHash, retryCount + 1), 2000);
        } else if (retryCount < 3) {
          // Additional retries in case indexing takes time
          setTimeout(() => fetchIndexedData(txHash, retryCount + 1), 3000);
        } else {
          setIndexerLoading(false);
          const errorData = await response.json().catch(() => ({}));
          setIndexedData({ 
            error: 'Transaction not found',
            message: errorData.message || 'The transaction was not found. It may not contain a FacilitatedTx event or the transaction hash is incorrect.'
          });
        }
        return;
      } else if (response.status === 503) {
        // Database not configured or connection failed
        const errorData = await response.json().catch(() => ({}));
        setIndexerLoading(false);
        setIndexedData({ 
          error: errorData.error || 'Indexer unavailable',
          message: errorData.message || 'The indexer database is not configured. Please check your DATABASE_URL environment variable in Vercel.'
        });
        return;
      } else {
        const errorData = await response.json().catch(() => ({}));
        setIndexerLoading(false);
        setIndexedData({ 
          error: `Indexer API error: ${response.status} ${response.statusText}`,
          message: errorData.message || errorData.error || 'An error occurred while fetching indexed data'
        });
      }
    } catch (error: any) {
      console.error('Error fetching indexed data:', error);
      // Check if it's a CORS or network error
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        setIndexerLoading(false);
        setIndexedData({ 
          error: 'CORS or network error. Please check if the indexer API is accessible.',
          details: error.message 
        });
        return;
      }
      // For other errors, retry if we haven't exceeded limit
      if (retryCount < 5) {
        setTimeout(() => fetchIndexedData(txHash, retryCount + 1), 3000);
      } else {
        setIndexerLoading(false);
        setIndexedData({ error: 'Failed to fetch indexed data after multiple retries', details: error.message });
      }
    }
  };

  const testPayment = async () => {
    if (isProcessing) return; // Prevent multiple clicks
    
    setIsProcessing(true);
    const startTime = Date.now();

    setStatus({ type: 'pending', text: 'Processing payment...' });
    setPaymentStatus({ type: 'pending', text: 'Initiating payment...' });
    setStatusCode('-');
    setTotalTime('-');
    setVerificationTime('-');
    setSettlementTime('-');
    setApiTime('-');
    setResponseHeaders('-');
    setRequestHeaders('-');
    setTxHash('-');
    setShowIndexedData(false);
    setIndexedData(null);

    try {
      const client = createX402Client({
        paymentEndpoint: `${API_BASE}/api/payment/process`,
        facilitatorAddress: facilitatorInfo?.contractAddress || '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
        chainId: facilitatorInfo?.chainId || 42101,
        onPaymentStatus: (statusText) => {
          setPaymentStatus({ type: 'pending', text: statusText });
        },
      });

      setStatus({ type: 'pending', text: 'Making request with x402 SDK...' });
      
      const response = await client.get(PROTECTED_ENDPOINT);

      const totalTimeMs = Date.now() - startTime;
      const headers: Record<string, string> = response.headers as any;

      const verificationTimeMs = headers['x-verification-time'] || '0';
      const settlementTimeMs = headers['x-settlement-time'] || '0';
      const apiTimeMs = totalTimeMs - parseInt(verificationTimeMs) - parseInt(settlementTimeMs);

      setStatusCode(`${response.status} ${response.statusText || 'OK'}`);
      setTotalTime(`${totalTimeMs}ms`);
      setVerificationTime(`${verificationTimeMs}ms`);
      setSettlementTime(`${settlementTimeMs}ms`);
      setApiTime(`${Math.max(0, apiTimeMs)}ms`);
      setResponseHeaders(JSON.stringify(headers, null, 2));
      setRequestHeaders(JSON.stringify({ 'X-PAYMENT': 'Automatically handled by x402Axios' }, null, 2));

      if (response.status === 200) {
        setStatus({ type: 'success', text: 'Payment Successful' });
        setPaymentStatus({ type: 'success', text: 'Payment verified and settled. The protected resource has been delivered.' });
      } else {
        setStatus({ type: 'error', text: 'Payment Failed' });
        setPaymentStatus({ type: 'error', text: 'Payment verification failed' });
      }

      // Extract transaction hash from payment proof
      // The x-payment-response header contains the payment proof JSON we sent
      const paymentResponseHeader = headers['x-payment-response'];
      let extractedTxHash: string | null = null;
      
      if (paymentResponseHeader) {
        try {
          // The header contains the payment proof JSON string we sent in X-PAYMENT header
          let parsedPayment: any;
          
          // Try parsing as JSON string first (most common case)
          if (typeof paymentResponseHeader === 'string') {
            try {
              parsedPayment = JSON.parse(paymentResponseHeader);
            } catch {
              // Try base64 decode if JSON parse fails
              try {
                parsedPayment = JSON.parse(atob(paymentResponseHeader));
              } catch {
                console.warn('Could not parse payment response header as JSON or base64');
              }
            }
          } else {
            parsedPayment = paymentResponseHeader;
          }
          
          // Extract txHash from payment proof (the proof we created in SDK)
          if (parsedPayment?.txHash) {
            extractedTxHash = parsedPayment.txHash;
          } else if (parsedPayment?.settlement?.txHash) {
            extractedTxHash = parsedPayment.settlement.txHash;
          }
        } catch (e) {
          console.warn('Error parsing payment response header:', e);
        }
      }
      
      // Also check response data as fallback
      if (!extractedTxHash && response.data && typeof response.data === 'object') {
        const data = response.data as any;
        if (data.txHash) {
          extractedTxHash = data.txHash;
        } else if (data.data?.txHash) {
          extractedTxHash = data.data.txHash;
        }
      }
      
      // Set txHash and fetch indexed data
      if (extractedTxHash) {
        console.log('Extracted transaction hash:', extractedTxHash);
        setTxHash(extractedTxHash);
        // Fetch indexed data from the indexer API
        fetchIndexedData(extractedTxHash);
      } else {
        console.warn('Could not extract transaction hash from payment response');
      }
    } catch (error: any) {
      console.error('Error:', error);
      setStatus({ type: 'error', text: `Error: ${error.message}` });
      setPaymentStatus({ type: 'error', text: 'Payment failed' });
      
      if (error.response?.status === 402) {
        setStatus({ type: 'pending', text: 'Payment Required (402)' });
        setPaymentStatus({ type: 'pending', text: `Payment required: ${error.response.data?.amount || 'unknown'} ${error.response.data?.currency || ''}` });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDemo = () => {
    setStatusCode('-');
    setTotalTime('-');
    setVerificationTime('-');
    setSettlementTime('-');
    setApiTime('-');
    setResponseHeaders('-');
    setRequestHeaders('-');
    setTxHash('-');
    setShowIndexedData(false);
    setIndexedData(null);
    setStatus({ type: 'pending', text: 'Ready to Test' });
    setPaymentStatus({ type: 'pending', text: 'Waiting for request...' });
  };

  return (
    <>
      <Head>
        <title>x402 Payment Protocol Demo - Push Chain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logo}>Push Chain x402</div>
          <nav style={styles.nav}>
            <a href="#" style={styles.navLink}>Demo</a>
            <a href="https://github.com" style={styles.navLink} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.npmjs.com/package/@pushchain/x402-sdk" style={styles.navLink} target="_blank" rel="noopener noreferrer">NPM</a>
          </nav>
        </div>

        <div style={styles.titleSection}>
          <h1 style={styles.title}>x402 Payment Protocol Demo</h1>
          <p style={styles.subtitle}>HTTP 402 on Push Blockchain</p>
        </div>

        <div style={styles.contentGrid}>
          {/* Left Column - API Response */}
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>API Response</h2>
            <div>
              <div style={styles.statusSection}>
                <div style={{...styles.statusBadge, ...styles[`statusBadge${status.type}`]}}>
                  <div style={styles.statusIcon}></div>
                  <span>{status.text}</span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>STATUS:</div>
                <div style={styles.infoValue}>{statusCode}</div>
              </div>

              <div style={styles.timingGrid}>
                <div style={styles.timingItem}>
                  <div style={styles.timingLabel}>Total</div>
                  <div style={styles.timingValue}>{totalTime}</div>
                </div>
                <div style={styles.timingItem}>
                  <div style={styles.timingLabel}>Verification</div>
                  <div style={styles.timingValue}>{verificationTime}</div>
                </div>
                <div style={styles.timingItem}>
                  <div style={styles.timingLabel}>Settlement</div>
                  <div style={styles.timingValue}>{settlementTime}</div>
                </div>
                <div style={styles.timingItem}>
                  <div style={styles.timingLabel}>API Processing</div>
                  <div style={styles.timingValue}>{apiTime}</div>
                </div>
              </div>

              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>RESPONSE HEADERS:</div>
                <div style={styles.jsonViewer}>{responseHeaders}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment Status */}
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Payment Status</h2>
            <div>
              <div style={styles.statusSection}>
                <div style={{...styles.statusBadge, ...styles[`statusBadge${paymentStatus.type}`]}}>
                  <div style={styles.statusIcon}></div>
                  <span>{paymentStatus.text}</span>
                </div>
              </div>

              {txHash && txHash !== '-' && (
                <div style={styles.txSection}>
                  <div style={styles.infoItem}>
                    <div style={styles.infoLabel}>TRANSACTION HASH:</div>
                    <div style={styles.infoValue}>{txHash}</div>
                  </div>
                  <a
                    href={`https://donut.push.network/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.explorerLink}
                  >
                    View on Explorer →
                  </a>
                </div>
              )}

              <div style={styles.infoItem}>
                <div style={styles.infoLabel}>REQUEST HEADERS:</div>
                <div style={styles.jsonViewer}>{requestHeaders}</div>
              </div>

              <div style={styles.buttonGroup}>
                <button 
                  onClick={testPayment} 
                  disabled={isProcessing}
                  style={{...styles.button, ...(isProcessing ? styles.buttonDisabled : {})}}
                >
                  {isProcessing ? 'Processing...' : 'Test Payment →'}
                </button>
                <button 
                  onClick={resetDemo} 
                  disabled={isProcessing}
                  style={{...styles.buttonSecondary, ...(isProcessing ? styles.buttonDisabled : {})}}
                >
                  Start Over →
                </button>
              </div>

              {/* Indexed Data Section */}
              {txHash && txHash !== '-' && (
                <div style={styles.indexedSection}>
                  <h3 style={styles.indexedTitle}>📊 Indexed Transaction Data</h3>
                  {indexerLoading && (
                    <div style={styles.loadingBox}>
                      <div style={{ color: '#6b7280', fontSize: '13px' }}>
                        Loading indexed data...
                      </div>
                    </div>
                  )}
                  {!indexerLoading && indexedData && indexedData.error && (
                    <div style={styles.loadingBox}>
                      <div style={{ color: '#f59e0b', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        ⚠️ {indexedData.error}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                        {indexedData.message || 'Transaction was successful, but not found in indexer. The API will attempt on-demand indexing automatically.'}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px', fontStyle: 'italic' }}>
                        💡 Tip: The indexer uses on-demand indexing - transactions are automatically indexed when requested if they contain FacilitatedTx events.
                      </div>
                      <div style={styles.txHashDisplay}>
                        {txHash}
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <a
                          href={`https://donut.push.network/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{...styles.explorerLink, color: '#3b82f6', textDecoration: 'underline', fontSize: '14px', fontWeight: '500'}}
                        >
                          View on Block Explorer →
                        </a>
                      </div>
                    </div>
                  )}
                  {showIndexedData && indexedData && indexedData.transaction && !indexedData.error && (
                    <div style={styles.indexedDataBox}>
                      <div style={styles.indexedHeader}>
                        <div style={styles.indexedSubtitle}>Indexed by Push Chain Indexer</div>
                        <div style={styles.indexedTxHash}>Transaction Hash: {indexedData.transaction.txHash}</div>
                      </div>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>Indexing Status:</div>
                        <div style={{...styles.infoValue, color: indexedData.transaction.status === 'confirmed' ? '#22c55e' : '#f59e0b'}}>
                          {indexedData.transaction.status}
                        </div>
                      </div>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>Block Number:</div>
                        <div style={styles.infoValue}>{indexedData.transaction.blockNumber}</div>
                      </div>
                      {indexedData.transaction.blockTimestamp && (
                        <div style={styles.infoItem}>
                          <div style={styles.infoLabel}>Block Timestamp:</div>
                          <div style={styles.infoValue}>
                            {new Date(indexedData.transaction.blockTimestamp).toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>From (Sender):</div>
                        <div style={styles.infoValue}>{indexedData.transaction.sender}</div>
                      </div>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>To (Recipient):</div>
                        <div style={styles.infoValue}>{indexedData.transaction.target}</div>
                      </div>
                      <div style={styles.infoItem}>
                        <div style={styles.infoLabel}>Value:</div>
                        <div style={{...styles.infoValue, color: '#ec4899', fontWeight: '600'}}>
                          {indexedData.transaction.value ? (parseInt(indexedData.transaction.value) / 1e18).toFixed(6) : '0'} PUSH
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={styles.explanation}>
          <h3>How x402Axios works</h3>
          <ol style={styles.explanationList}>
            <li><strong>Initial Request:</strong> Tries to access resource (no payment)</li>
            <li><strong>402 Detection:</strong> Server returns 402 Payment Required with payment specification</li>
            <li><strong>Extract Requirements:</strong> Client extracts network, amount, and recipient from 402 response</li>
            <li><strong>Payment Processing:</strong> Client initiates payment transaction on blockchain</li>
            <li><strong>Retry with Payment:</strong> Client retries request with X-PAYMENT header containing payment proof</li>
            <li><strong>Resource Delivery:</strong> Server verifies payment and delivers protected resource</li>
          </ol>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#ffffff',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
  },
  nav: {
    display: 'flex',
    gap: '24px',
  },
  navLink: {
    color: '#6b7280',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    margin: 0,
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '40px',
  },
  panel: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 20px 0',
  },
  statusSection: {
    marginBottom: '24px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  statusBadgepending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusBadgesuccess: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusBadgeerror: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusIcon: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'currentColor',
  },
  infoItem: {
    marginBottom: '16px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  infoValue: {
    fontSize: '14px',
    color: '#111827',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
  },
  timingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  timingItem: {
    textAlign: 'center',
  },
  timingLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  timingValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
  },
  jsonViewer: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '200px',
    overflow: 'auto',
  },
  txSection: {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
  },
  explorerLink: {
    display: 'inline-block',
    marginTop: '8px',
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#111827',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#111827',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },
  indexedSection: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: '#fefbf7',
    border: '2px solid #ec4899',
    borderRadius: '8px',
  },
  indexedTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ec4899',
    margin: '0 0 16px 0',
  },
  loadingBox: {
    backgroundColor: '#faf5f0',
    border: '1px solid #fce7f3',
    borderRadius: '6px',
    padding: '24px',
    textAlign: 'center',
  },
  txHashDisplay: {
    color: '#ec4899',
    fontSize: '13px',
    fontFamily: 'monospace',
    marginTop: '12px',
    wordBreak: 'break-all',
  },
  queryInfo: {
    color: '#6b7280',
    fontSize: '12px',
    marginTop: '12px',
    fontFamily: 'monospace',
  },
  indexedDataBox: {
    backgroundColor: '#faf5f0',
    border: '1px solid #fce7f3',
    borderRadius: '6px',
    padding: '16px',
  },
  indexedHeader: {
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #fce7f3',
  },
  indexedSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
  },
  indexedTxHash: {
    fontSize: '14px',
    color: '#ec4899',
    fontWeight: '600',
  },
  explanation: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
  },
  explanationList: {
    margin: '16px 0 0 0',
    paddingLeft: '20px',
    color: '#374151',
    lineHeight: '1.8',
  },
};
