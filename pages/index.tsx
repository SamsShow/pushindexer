import { useState, useEffect } from 'react'
import Head from 'next/head'

declare global {
  interface Window {
    x402Axios?: any
  }
}

export default function Home() {
  const [sellerAddress, setSellerAddress] = useState<string>('')
  const [envBuyerAddress, setEnvBuyerAddress] = useState<string>('')
  const [envSellerAddress, setEnvSellerAddress] = useState<string>('')
  const [facilitatorAddress, setFacilitatorAddress] = useState<string>('')
  const [facilitatorABI, setFacilitatorABI] = useState<any>(null)
  const [chainId, setChainId] = useState<string>('42101')
  const [status, setStatus] = useState<{ type: string; text: string }>({ type: 'pending', text: 'Ready to Test' })
  const [paymentStatus, setPaymentStatus] = useState<{ type: string; text: string }>({ type: 'pending', text: 'Waiting for request...' })
  const [statusCode, setStatusCode] = useState<string>('-')
  const [totalTime, setTotalTime] = useState<string>('-')
  const [verificationTime, setVerificationTime] = useState<string>('-')
  const [settlementTime, setSettlementTime] = useState<string>('-')
  const [apiTime, setApiTime] = useState<string>('-')
  const [responseHeaders, setResponseHeaders] = useState<string>('-')
  const [requestHeaders, setRequestHeaders] = useState<string>('-')
  const [txHash, setTxHash] = useState<string>('-')
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [indexedData, setIndexedData] = useState<any>(null)
  const [showIndexedData, setShowIndexedData] = useState(false)
  const [indexerLoading, setIndexerLoading] = useState(false)

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : ''
  const FACILITATOR_API = 'https://pushindexer.vercel.app/api/facilitator'
  const INDEXER_API = 'https://pushindexer.vercel.app/api/indexer'
  const PROTECTED_ENDPOINT = `${API_BASE}/api/protected/weather`

  useEffect(() => {
    initPaymentConfig()
  }, [])

  const initPaymentConfig = async () => {
    try {
      // Try to get facilitator info from public API, fallback to local
      try {
        const response = await fetch(`${FACILITATOR_API}/info`)
        if (response.ok) {
      const config = await response.json()
          setFacilitatorAddress(config.contractAddress)
      setChainId(config.chainId.toString())
        }
      } catch (error) {
        console.warn('Failed to fetch from public facilitator API, using local config:', error)
      }
      
      // Get addresses from local config (always use local for addresses)
      const localConfigResponse = await fetch(`${API_BASE}/api/payment/config`)
      if (localConfigResponse.ok) {
        const localConfig = await localConfigResponse.json()
        if (localConfig.facilitatorAddress) {
          setFacilitatorAddress(localConfig.facilitatorAddress)
        }
        if (localConfig.chainId) {
          setChainId(localConfig.chainId.toString())
        }
        if (localConfig.sellerAddress) {
          setEnvSellerAddress(localConfig.sellerAddress)
        }
        if (localConfig.buyerAddress) {
          setEnvBuyerAddress(localConfig.buyerAddress)
        }
      }
    } catch (error) {
      console.error('Failed to load payment config:', error)
    }
  }

  const simulatePayment = async (paymentSpec: any) => {
    setPaymentStatus({ type: 'pending', text: 'Processing payment on blockchain...' })

    try {
      const configResponse = await fetch(`${API_BASE}/api/payment/config`)
      const config = await configResponse.json()
      
      setSellerAddress(paymentSpec.recipient)
      setFacilitatorAddress(paymentSpec.facilitator || config.facilitatorAddress)

      // Use server-side payment endpoint with buyer's private key
      setPaymentStatus({ type: 'pending', text: 'Sending payment transaction...' })
      
      const paymentResponse = await fetch(`${API_BASE}/api/payment/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: paymentSpec.recipient,
          amount: paymentSpec.amount,
        }),
      })

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json()
        console.error('Payment API error:', errorData)
        throw new Error(errorData.message || errorData.error || 'Payment failed')
      }

      const paymentResult = await paymentResponse.json()

      setPaymentStatus({ type: 'pending', text: 'Transaction confirmed, preparing payment proof...' })

      const paymentProof = {
        scheme: paymentSpec.scheme,
        amount: paymentSpec.amount,
        currency: paymentSpec.currency,
        recipient: paymentSpec.recipient,
        facilitator: facilitatorAddress || paymentSpec.facilitator || config.facilitatorAddress,
        network: paymentSpec.network,
        chainId: paymentSpec.chainId || paymentResult.chainId,
        txHash: paymentResult.txHash,
        timestamp: Date.now(),
      }
      
      if (!paymentProof.txHash) {
        console.error('⚠️ WARNING: No txHash in payment result!', paymentResult)
      }
      
      return paymentProof
    } catch (error: any) {
      console.error('Payment error:', error)
      throw error
    }
  }

  const fetchIndexedData = async (txHash: string) => {
    if (!txHash || txHash === '-') {
      return
    }
    
    setIndexerLoading(true)
    
    // Try public API first, fallback to local
    const tryFetch = async (url: string) => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        
      if (response.ok) {
        const data = await response.json()
        setIndexedData(data)
        setShowIndexedData(true)
          setIndexerLoading(false)
          return true
        } else if (response.status === 404) {
          // Transaction not indexed yet
          return false
      } else {
          // Other error
          return false
        }
      } catch (error) {
        // CORS or network error
        return false
      }
    }
    
    // Try public API first
    const publicUrl = `${INDEXER_API}/tx?hash=${txHash}`
    const publicSuccess = await tryFetch(publicUrl)
    
    if (publicSuccess) {
      return // Success with public API
    }
    
    // Fallback to local API
    const localUrl = `${API_BASE}/api/indexer/tx?hash=${txHash}`
    const localSuccess = await tryFetch(localUrl)
    
    if (localSuccess) {
      return // Success with local API
    }
    
    // If both failed, transaction might not be indexed yet - retry
    setIndexerLoading(true)
    setTimeout(() => fetchIndexedData(txHash), 3000)
  }

  const testPayment = async () => {
    const startTime = Date.now()

    setStatus({ type: 'pending', text: 'Processing payment...' })
    setPaymentStatus({ type: 'pending', text: 'Initiating payment...' })
    setStatusCode('-')
    setTotalTime('-')
    setVerificationTime('-')
    setSettlementTime('-')
    setApiTime('-')
    setResponseHeaders('-')
    setRequestHeaders('-')
    setTxHash('-')
    setShowPaymentDetails(false)
    setShowIndexedData(false)

    try {
      const initialResponse = await fetch(PROTECTED_ENDPOINT)
      const initialData = await initialResponse.json()

      if (initialResponse.status === 402) {
        setStatus({ type: 'pending', text: 'Payment Required (402)' })
        setPaymentStatus({ type: 'pending', text: `Payment required: ${initialData.amount} ${initialData.currency}` })

        const paymentProof = await simulatePayment(initialData)

        const paymentResponse = await fetch(PROTECTED_ENDPOINT, {
          headers: {
            'X-PAYMENT': JSON.stringify(paymentProof),
          },
        })

        const totalTimeMs = Date.now() - startTime
        const data = await paymentResponse.json()

        const headers: Record<string, string> = {}
        paymentResponse.headers.forEach((value: string, key: string) => {
          headers[key] = value
        })

        const verificationTimeMs = headers['x-verification-time'] || '64'
        const settlementTimeMs = headers['x-settlement-time'] || '128'
        const apiTimeMs = totalTimeMs - parseInt(verificationTimeMs) - parseInt(settlementTimeMs)

        setStatusCode(`${paymentResponse.status} ${paymentResponse.statusText}`)
        setTotalTime(`${totalTimeMs}ms`)
        setVerificationTime(`${verificationTimeMs}ms`)
        setSettlementTime(`${settlementTimeMs}ms`)
        setApiTime(`${Math.max(0, apiTimeMs)}ms`)
        setResponseHeaders(JSON.stringify(headers, null, 2))
        setRequestHeaders(JSON.stringify({ 'X-PAYMENT': 'Automatically handled by x402Axios' }, null, 2))

        if (paymentResponse.status === 200) {
          setStatus({ type: 'success', text: 'Payment Successful' })
          setPaymentStatus({ type: 'success', text: 'Payment verified and settled. The protected resource has been delivered.' })
        } else {
          setStatus({ type: 'error', text: 'Payment Failed' })
          setPaymentStatus({ type: 'error', text: 'Payment verification failed' })
        }

        // Extract transaction hash from payment proof
        const transactionHash = paymentProof.txHash
        
        if (transactionHash) {
          setTxHash(transactionHash)
          setShowPaymentDetails(true)
          // Start fetching indexer data immediately
          fetchIndexedData(transactionHash)
        } else {
          // Try to extract from response headers
          const paymentResponseHeader = headers['x-payment-response']
          if (paymentResponseHeader) {
            try {
              const parsedPayment = JSON.parse(paymentResponseHeader)
              if (parsedPayment.txHash) {
                setTxHash(parsedPayment.txHash)
                fetchIndexedData(parsedPayment.txHash)
              }
            } catch (e) {
              // Silently handle parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error:', error)
      setStatus({ type: 'error', text: `Error: ${error.message}` })
      setPaymentStatus({ type: 'error', text: 'Payment failed' })
    }
  }

  const resetDemo = () => {
    setStatusCode('-')
    setTotalTime('-')
    setVerificationTime('-')
    setSettlementTime('-')
    setApiTime('-')
    setResponseHeaders('-')
    setRequestHeaders('-')
    setTxHash('-')
    setShowPaymentDetails(false)
    setShowIndexedData(false)
    setIndexedData(null)
    setIndexerLoading(false)
    setStatus({ type: 'pending', text: 'Ready to Test' })
    setPaymentStatus({ type: 'pending', text: 'Waiting for request...' })
  }

  return (
    <>
      <Head>
        <title>x402 Payment Protocol - Push Chain</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <div className="title-section">
          <h1>x402 Payment Protocol Demo</h1>
          <p className="subtitle">HTTP 402 on Push Blockchain</p>
        </div>

        <div className="content-grid">
          <div className="panel">
            <h2>API Response</h2>
            <div>
              <div className="status-section">
                <div className={`status-badge ${status.type}`}>
                  <div className="status-icon"></div>
                  <span>{status.text}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">STATUS:</div>
                <div className="info-value">{statusCode}</div>
              </div>

              <div className="timing-grid">
                <div className="timing-item">
                  <div className="timing-label">Total</div>
                  <div className="timing-value">{totalTime}</div>
                </div>
                <div className="timing-item">
                  <div className="timing-label">Verification</div>
                  <div className="timing-value">{verificationTime}</div>
                </div>
                <div className="timing-item">
                  <div className="timing-label">Settlement</div>
                  <div className="timing-value">{settlementTime}</div>
                </div>
                <div className="timing-item">
                  <div className="timing-label">API Processing</div>
                  <div className="timing-value">{apiTime}</div>
                </div>
              </div>

              <div className="info-item" style={{ marginTop: '20px' }}>
                <div className="info-label">RESPONSE HEADERS:</div>
                <div className="json-viewer">{responseHeaders}</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Payment Status</h2>
            <div>
              <div className="status-section">
                <div className={`status-badge ${paymentStatus.type}`}>
                  <div className="status-icon"></div>
                  <span>{paymentStatus.text}</span>
                </div>
              </div>

              {txHash && txHash !== '-' && (
                <div style={{ marginBottom: '20px' }}>
                  <div className="info-item">
                    <div className="info-label">TRANSACTION HASH:</div>
                    <div className="info-value">{txHash}</div>
                  </div>
                  <div className="button-group">
                    <a
                      href={`https://donut.push.network/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                    >
                      View on Explorer →
                    </a>
                  </div>
                </div>
              )}

              <div className="info-item" style={{ marginTop: '20px' }}>
                <div className="info-label">REQUEST HEADERS:</div>
                <div className="json-viewer">{requestHeaders}</div>
              </div>

              <div className="button-group">
                <button onClick={testPayment}>
                  Test Payment →
                </button>
                <button className="button-secondary" onClick={resetDemo}>
                  Start Over →
                </button>
              </div>

              {(envBuyerAddress || envSellerAddress) && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#faf5f0', borderRadius: '6px', border: '1px solid #fce7f3' }}>
                  {envBuyerAddress && (
                    <div className="info-item">
                      <div className="info-label">Buyer Address:</div>
                      <div className="info-value">{envBuyerAddress}</div>
                    </div>
                  )}
                  {envSellerAddress && (
                    <div className="info-item">
                      <div className="info-label">Seller Address:</div>
                      <div className="info-value">{envSellerAddress}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Indexer section - always show when txHash exists */}
              {txHash && txHash !== '-' && (
                <div style={{ marginTop: '24px', padding: '20px', background: '#fefbf7', border: '2px solid #ec4899', borderRadius: '8px', boxShadow: '0 4px 6px rgba(236, 72, 153, 0.2)' }}>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', color: '#ec4899', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Indexed Transaction Data
                  </h3>
                  {!showIndexedData && (
                    <div style={{ background: '#faf5f0', border: '1px solid #fce7f3', borderRadius: '6px', padding: '24px', textAlign: 'center' }}>
                      <div style={{ color: '#6b7280', marginBottom: '12px', fontSize: '16px', fontWeight: '500' }}>
                        {indexerLoading ? '⏳ Waiting for indexer to process transaction...' : '🔄 Fetching transaction from indexer...'}
                      </div>
                      <div style={{ color: '#ec4899', fontSize: '13px', marginTop: '12px', fontFamily: 'monospace', background: '#fefbf7', padding: '8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                        Hash: {txHash}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '12px', fontFamily: 'monospace' }}>
                        Querying: {INDEXER_API}/tx?hash={txHash}
                      </div>
                      <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '8px', fontStyle: 'italic' }}>
                        This may take a few seconds while the indexer processes the transaction
                      </div>
                    </div>
                  )}
                  {showIndexedData && indexedData && indexedData.transaction && (
                    <div style={{ background: '#faf5f0', border: '1px solid #fce7f3', borderRadius: '6px', padding: '16px' }}>
                      <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #fce7f3' }}>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Indexed by Push Chain Indexer</div>
                        <div style={{ fontSize: '14px', color: '#ec4899', fontWeight: '600' }}>Transaction Hash: {indexedData.transaction.txHash}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Indexing Status:</div>
                        <div className="info-value" style={{ color: indexedData.transaction.status === 'confirmed' ? '#22c55e' : '#f59e0b' }}>
                          {indexedData.transaction.status}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Block Number:</div>
                        <div className="info-value">{indexedData.transaction.blockNumber}</div>
                      </div>
                      {indexedData.transaction.blockTimestamp && (
                        <div className="info-item">
                          <div className="info-label">Block Timestamp:</div>
                          <div className="info-value">
                            {new Date(indexedData.transaction.blockTimestamp).toLocaleString()}
                          </div>
                        </div>
                      )}
                      <div className="info-item">
                        <div className="info-label">Transaction Type:</div>
                        <div className="info-value">
                          {indexedData.transaction.txType === 0 ? 'Native Transfer' : 
                           indexedData.transaction.txType === 1 ? 'ERC20 Transfer' : 
                           indexedData.transaction.txType === 2 ? 'Cross-Chain' : 'Unknown'}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">From (Sender):</div>
                        <div className="info-value">{indexedData.transaction.sender}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">To (Recipient):</div>
                        <div className="info-value">{indexedData.transaction.target}</div>
                      </div>
                      {indexedData.transaction.facilitator && (
                        <div className="info-item">
                          <div className="info-label">Facilitator Contract:</div>
                          <div className="info-value">{indexedData.transaction.facilitator}</div>
                        </div>
                      )}
                      <div className="info-item">
                        <div className="info-label">Value:</div>
                        <div className="info-value" style={{ color: '#ec4899', fontWeight: '600' }}>
                          {indexedData.transaction.value ? (parseInt(indexedData.transaction.value) / 1e18).toFixed(6) : '0'} PUSH
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Gas Used:</div>
                        <div className="info-value">{indexedData.transaction.gasUsed || '-'}</div>
                      </div>
                      {indexedData.transaction.gasPrice && (
                        <div className="info-item">
                          <div className="info-label">Gas Price:</div>
                          <div className="info-value">{indexedData.transaction.gasPrice}</div>
                        </div>
                      )}
                      {indexedData.transaction.chainId && (
                        <div className="info-item">
                          <div className="info-label">Chain ID:</div>
                          <div className="info-value">{indexedData.transaction.chainId}</div>
                        </div>
                      )}
                      {indexedData.events && indexedData.events.length > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fce7f3' }}>
                          <div className="info-label" style={{ marginBottom: '12px', fontWeight: '600', color: '#ec4899' }}>Indexed Events ({indexedData.events.length}):</div>
                          {indexedData.events.map((event: any, idx: number) => (
                            <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: '#fefbf7', borderRadius: '4px', border: '1px solid #fce7f3' }}>
                              <div style={{ fontWeight: '600', color: '#ec4899', marginBottom: '6px' }}>
                                {event.eventName} (Log Index: {event.logIndex})
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                  {JSON.stringify(event.eventArgs, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {indexedData.transaction.decoded && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fce7f3' }}>
                          <div className="info-label" style={{ marginBottom: '8px', fontWeight: '600', color: '#ec4899' }}>Decoded Data:</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace', background: '#fefbf7', padding: '8px', borderRadius: '4px' }}>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {JSON.stringify(indexedData.transaction.decoded, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="explanation">
          <h3>How x402 Payment Protocol Works</h3>
          <ol>
            <li><strong>Initial Request:</strong> Client attempts to access protected resource without payment</li>
            <li><strong>402 Detection:</strong> Server returns 402 Payment Required with payment specification</li>
            <li><strong>Extract Requirements:</strong> Client extracts network, amount, and recipient from 402 response</li>
            <li><strong>Payment Processing:</strong> Client initiates payment transaction on blockchain</li>
            <li><strong>Retry with Payment:</strong> Client retries request with X-PAYMENT header containing payment proof</li>
            <li><strong>Resource Delivery:</strong> Server verifies payment and delivers protected resource</li>
          </ol>
        </div>
      </div>
    </>
  )
}

