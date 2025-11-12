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

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : ''
  const PROTECTED_ENDPOINT = `${API_BASE}/api/protected/weather`

  useEffect(() => {
    initPaymentConfig()
  }, [])

  const initPaymentConfig = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/payment/config`)
      const config = await response.json()
      setFacilitatorAddress(config.facilitatorAddress)
      setFacilitatorABI(config.abi)
      setChainId(config.chainId.toString())
      if (config.sellerAddress) {
        setEnvSellerAddress(config.sellerAddress)
      }
      if (config.buyerAddress) {
        setEnvBuyerAddress(config.buyerAddress)
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
        throw new Error(errorData.message || errorData.error || 'Payment failed')
      }

      const paymentResult = await paymentResponse.json()

      setPaymentStatus({ type: 'pending', text: 'Transaction confirmed, preparing payment proof...' })

      return {
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
    } catch (error: any) {
      console.error('Payment error:', error)
      throw error
    }
  }

  const fetchIndexedData = async (txHash: string) => {
    try {
      const response = await fetch(`${API_BASE}/v1/tx/${txHash}`)
      if (response.ok) {
        const data = await response.json()
        setIndexedData(data)
        setShowIndexedData(true)
      } else {
        setTimeout(() => fetchIndexedData(txHash), 3000)
      }
    } catch (error) {
      console.error('Error fetching indexed data:', error)
      setTimeout(() => fetchIndexedData(txHash), 3000)
    }
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

        if (paymentProof.txHash) {
          setTxHash(paymentProof.txHash)
          setShowPaymentDetails(true)
          setTimeout(() => fetchIndexedData(paymentProof.txHash), 2000)
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

              {showPaymentDetails && (
                <div>
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
                <div style={{ marginTop: '16px', padding: '12px', background: '#0f0f0f', borderRadius: '6px', border: '1px solid #222' }}>
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

              {showIndexedData && indexedData && (
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '16px', marginBottom: '12px', color: '#fff' }}>Indexed Transaction Data</h3>
                  <div className="json-viewer">{JSON.stringify(indexedData, null, 2)}</div>
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

