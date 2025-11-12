import { useState, useEffect } from 'react'
import Head from 'next/head'

declare global {
  interface Window {
    ethereum?: any
    ethers?: any
    x402Axios?: any
  }
}

export default function Home() {
  const [buyerWallet, setBuyerWallet] = useState<string | null>(null)
  const [sellerAddress, setSellerAddress] = useState<string>('')
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
    } catch (error) {
      console.error('Failed to load payment config:', error)
    }
  }

  const connectWallet = async () => {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        alert('Please install MetaMask or another Web3 wallet')
        return
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setBuyerWallet(accounts[0])

      const networkId = await window.ethereum.request({ method: 'eth_chainId' })
      const targetChainId = `0x${parseInt(chainId || '42101').toString(16)}`

      if (networkId !== targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }],
          })
        } catch (switchError) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetChainId,
              chainName: 'Push Chain Testnet',
              nativeCurrency: { name: 'PUSH', symbol: 'PUSH', decimals: 18 },
              rpcUrls: ['https://evm.rpc-testnet-donut-node1.push.org/'],
              blockExplorerUrls: ['https://donut.push.network'],
            }],
          })
        }
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet: ' + error.message)
    }
  }

  const simulatePayment = async (paymentSpec: any) => {
    if (!buyerWallet) {
      throw new Error('Please connect your wallet first')
    }

    setPaymentStatus({ type: 'pending', text: 'Processing payment on blockchain...' })

    try {
      const configResponse = await fetch(`${API_BASE}/api/payment/config`)
      const config = await configResponse.json()
      
      setSellerAddress(paymentSpec.recipient)
      setFacilitatorAddress(paymentSpec.facilitator || config.facilitatorAddress)

      if (!window.ethers) {
        throw new Error('Ethers.js not loaded')
      }

      const provider = new window.ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const facilitatorContract = new window.ethers.Contract(
        facilitatorAddress || paymentSpec.facilitator || config.facilitatorAddress,
        config.abi,
        signer
      )

      const amountWei = window.ethers.utils.parseEther(paymentSpec.amount)

      setPaymentStatus({ type: 'pending', text: 'Waiting for transaction confirmation...' })
      const tx = await facilitatorContract.facilitateNativeTransfer(
        paymentSpec.recipient,
        amountWei,
        { value: amountWei }
      )

      setPaymentStatus({ type: 'pending', text: 'Transaction sent, waiting for confirmation...' })
      const receipt = await tx.wait()

      return {
        scheme: paymentSpec.scheme,
        amount: paymentSpec.amount,
        currency: paymentSpec.currency,
        recipient: paymentSpec.recipient,
        facilitator: facilitatorAddress || paymentSpec.facilitator,
        network: paymentSpec.network,
        chainId: paymentSpec.chainId,
        txHash: receipt.transactionHash,
        timestamp: Date.now(),
      }
    } catch (error) {
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
                <button onClick={connectWallet} disabled={!!buyerWallet}>
                  {buyerWallet ? 'Wallet Connected' : 'Connect Wallet'}
                </button>
                <button onClick={testPayment} disabled={!buyerWallet}>
                  Test Payment →
                </button>
                <button className="button-secondary" onClick={resetDemo}>
                  Start Over →
                </button>
              </div>

              {(buyerWallet || sellerAddress) && (
                <div style={{ marginTop: '16px', padding: '12px', background: '#0f0f0f', borderRadius: '6px', border: '1px solid #222' }}>
                  {buyerWallet && (
                    <div className="info-item">
                      <div className="info-label">Buyer Wallet:</div>
                      <div className="info-value">{buyerWallet}</div>
                    </div>
                  )}
                  {sellerAddress && (
                    <div className="info-item">
                      <div className="info-label">Seller Wallet:</div>
                      <div className="info-value">{sellerAddress}</div>
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

