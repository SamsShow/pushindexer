import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type Section = 'introduction' | 'quickstart' | 'installation' | 'configuration' | 'usage' | 'browser-wallet' | 'server-side' | 'universal-tx' | 'tokens' | 'api-reference' | 'examples';

const CodeBlock = ({ code, language = 'typescript', title }: { code: string; language?: string; title?: string }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-gray-200 bg-gray-900 shadow-sm">
      {title && (
        <div className="px-4 py-2 bg-gray-800 text-gray-400 text-sm font-mono border-b border-gray-700">
          {title}
        </div>
      )}
      <div className="relative">
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-gray-100 leading-relaxed">{code}</code>
        </pre>
        <button 
          onClick={copyCode}
          className="absolute top-3 right-3 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-md transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

const Callout = ({ type, title, children }: { type: 'info' | 'warning' | 'success' | 'tip'; title?: string; children: React.ReactNode }) => {
  const styles = {
    info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: 'ℹ️', text: 'text-blue-800' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-300', icon: '⚠️', text: 'text-amber-800' },
    success: { bg: 'bg-green-50', border: 'border-green-300', icon: '✓', text: 'text-green-800' },
    tip: { bg: 'bg-purple-50', border: 'border-purple-300', icon: '💡', text: 'text-purple-800' },
  };

  const style = styles[type];

  return (
    <div className={`flex gap-3 p-4 my-6 rounded-xl ${style.bg} border-l-4 ${style.border}`}>
      <span className="text-xl">{style.icon}</span>
      <div className={style.text}>
        {title && <strong className="block mb-1">{title}</strong>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>('introduction');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections = [
    { id: 'introduction', title: 'Introduction', icon: '📖' },
    { id: 'quickstart', title: 'Quick Start', icon: '🚀' },
    { id: 'installation', title: 'Installation', icon: '📦' },
    { id: 'configuration', title: 'Configuration', icon: '⚙️' },
    { id: 'usage', title: 'Basic Usage', icon: '💻' },
    { id: 'browser-wallet', title: 'Browser Wallet', icon: '🦊' },
    { id: 'server-side', title: 'Server-Side', icon: '🖥️' },
    { id: 'universal-tx', title: 'Universal Transaction', icon: '🌐' },
    { id: 'tokens', title: 'Supported Tokens', icon: '🪙' },
    { id: 'api-reference', title: 'API Reference', icon: '📚' },
    { id: 'examples', title: 'Examples', icon: '✨' },
  ];

  return (
    <>
      <Head>
        <title>Documentation - Push x402 SDK</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-[#f5f1eb] font-sans">
        {/* Top Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f5f1eb]/95 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <img src="/pushchain.png" alt="Push Chain" className="h-8 w-auto rounded-md" />
                  <span className="font-bold text-xl text-gray-900">Push x402</span>
                </Link>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  v0.3.0
                </span>
              </div>
              
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  Home
                </Link>
                <Link href="/demo" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  Demo
                </Link>
                <a href="https://github.com/SamsShow/pushindexer" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
                  GitHub
                </a>
                <a 
                  href="https://www.npmjs.com/package/push-x402" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#CB3837] hover:bg-[#b32f2f] text-white rounded-lg transition-colors font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 576 512" fill="currentColor">
                    <path d="M288 288h-32v-64h32v64zm288-128v192H288v32H160v-32H0V160h576zm-416 32H32v128h64v-96h32v96h32V192zm160 0H192v160h64v-32h64V192zm224 0H352v128h64v-96h32v96h32v-96h32v96h32V192z"/>
                  </svg>
                  npm
                </a>
              </div>

              {/* Mobile menu button */}
              <button 
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </nav>

        <div className="flex pt-20">
          {/* Sidebar */}
          <aside className={`fixed left-0 top-20 bottom-0 w-72 bg-white/50 border-r border-gray-200 overflow-y-auto transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="p-6">
              <nav className="space-y-8">
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Getting Started</h3>
                  <div className="space-y-1">
                    {sections.slice(0, 5).map((section) => (
                      <button
                        key={section.id}
                        onClick={() => { setActiveSection(section.id as Section); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === section.id 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span>{section.icon}</span>
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Payment Methods</h3>
                  <div className="space-y-1">
                    {sections.slice(5, 8).map((section) => (
                      <button
                        key={section.id}
                        onClick={() => { setActiveSection(section.id as Section); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === section.id 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span>{section.icon}</span>
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reference</h3>
                  <div className="space-y-1">
                    {sections.slice(8).map((section) => (
                      <button
                        key={section.id}
                        onClick={() => { setActiveSection(section.id as Section); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                          activeSection === section.id 
                            ? 'bg-purple-100 text-purple-700 font-medium' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span>{section.icon}</span>
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 md:ml-72 min-h-screen">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {activeSection === 'introduction' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Push x402 SDK</h1>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    A plug-and-play SDK for implementing the HTTP 402 Payment Required protocol on Push Chain.
                    Accept crypto payments for API calls with just a few lines of code.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {[
                      { icon: '🔌', title: 'Plug & Play', desc: 'Drop-in replacement for axios. Just swap the import and you\'re ready to go.' },
                      { icon: '🌐', title: 'Multi-Chain', desc: 'Pay from any chain - Ethereum, Base, Arbitrum, Solana via Universal Transaction.' },
                      { icon: '🔐', title: 'Secure', desc: 'Built on Push Chain with on-chain verification. No centralized payment processors.' },
                      { icon: '🤖', title: 'Agent-Ready', desc: 'Perfect for AI agents that need to make autonomous payments for API access.' },
                    ].map((feature, i) => (
                      <div key={i} className="p-6 bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
                        <span className="text-3xl mb-3 block">{feature.icon}</span>
                        <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.desc}</p>
                      </div>
                    ))}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-6">How It Works</h2>
                  <div className="flex flex-wrap items-center justify-center gap-4 p-8 bg-white rounded-2xl border border-gray-200 mb-8">
                    {[
                      { num: '1', title: 'Request', desc: 'Client requests protected resource' },
                      { num: '2', title: '402 Response', desc: 'Server returns payment requirements' },
                      { num: '3', title: 'Auto Payment', desc: 'SDK processes payment on Push Chain' },
                      { num: '4', title: 'Access', desc: 'Server verifies and returns data' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="flex flex-col items-center text-center max-w-[140px]">
                          <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-2">
                            {step.num}
                          </div>
                          <div className="font-medium text-gray-900 text-sm">{step.title}</div>
                          <div className="text-xs text-gray-500">{step.desc}</div>
                        </div>
                        {i < 3 && <span className="text-purple-400 text-2xl hidden sm:block">→</span>}
                      </div>
                    ))}
                  </div>

                  <Callout type="info" title="Why HTTP 402?">
                    The HTTP 402 status code was reserved for &quot;Payment Required&quot; since HTTP/1.1.
                    Push x402 finally implements this vision - APIs that can monetize directly with crypto payments.
                  </Callout>
                </article>
              )}

              {activeSection === 'quickstart' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Quick Start</h1>
                  <p className="text-xl text-gray-600 mb-8">Get up and running with Push x402 in under 5 minutes.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Install the SDK</h2>
                  <CodeBlock 
                    code="npm install push-x402 axios ethers"
                    language="bash"
                    title="Terminal"
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Create a Client</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

// That's it! The client handles 402 responses automatically
const client = createX402Client({
  walletProvider: window.ethereum, // Browser wallet
});`}
                    title="client.ts"
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Make Requests</h2>
                  <CodeBlock 
                    code={`// Request a paid API - payment happens automatically!
const response = await client.get('https://api.example.com/premium/data');

console.log(response.data); // Your premium data`}
                    title="app.ts"
                  />

                  <Callout type="success" title="That's it!">
                    The SDK automatically detects 402 responses, processes payment via Push Chain,
                    and retries the request with payment proof. Zero additional code required.
                  </Callout>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4 mt-8">For AI Agents / Server-Side</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

const client = createX402Client({
  privateKey: process.env.AGENT_PRIVATE_KEY, // Autonomous payments
});

// Agent can now pay for API calls automatically
const data = await client.get('https://api.example.com/ai/inference');`}
                    title="agent.ts"
                  />
                </article>
              )}

              {activeSection === 'installation' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Installation</h1>
                  <p className="text-xl text-gray-600 mb-8">Install the Push x402 SDK and its dependencies.</p>

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">npm</h2>
                      <CodeBlock code="npm install push-x402 axios ethers" language="bash" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">yarn</h2>
                      <CodeBlock code="yarn add push-x402 axios ethers" language="bash" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">pnpm</h2>
                      <CodeBlock code="pnpm add push-x402 axios ethers" language="bash" />
                    </div>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Peer Dependencies</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Package</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Version</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Required</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr><td className="px-4 py-3 font-mono text-sm text-purple-600">axios</td><td className="px-4 py-3 text-sm text-gray-600">^1.6.0</td><td className="px-4 py-3 text-sm text-green-600">✅ Yes</td></tr>
                        <tr><td className="px-4 py-3 font-mono text-sm text-purple-600">ethers</td><td className="px-4 py-3 text-sm text-gray-600">^6.0.0</td><td className="px-4 py-3 text-sm text-green-600">✅ Yes</td></tr>
                        <tr><td className="px-4 py-3 font-mono text-sm text-purple-600">@pushchain/core</td><td className="px-4 py-3 text-sm text-gray-600">^1.1.0</td><td className="px-4 py-3 text-sm text-gray-500">Optional</td></tr>
                        <tr><td className="px-4 py-3 font-mono text-sm text-purple-600">viem</td><td className="px-4 py-3 text-sm text-gray-600">^2.0.0</td><td className="px-4 py-3 text-sm text-gray-500">Optional</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <Callout type="tip">
                    If you&apos;re using Universal Transaction for cross-chain payments, install <code className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-sm font-mono">@pushchain/core</code> as well.
                  </Callout>
                </article>
              )}

              {activeSection === 'configuration' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Configuration</h1>
                  <p className="text-xl text-gray-600 mb-8">Configure the SDK to match your use case.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuration Options</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

const client = createX402Client({
  // === Payment Methods (choose one) ===
  walletProvider: window.ethereum,     // Browser wallet (MetaMask, etc.)
  privateKey: 'your-private-key',      // Server-side / agents
  
  // === Network Settings ===
  network: 'push-testnet',             // Network preset
  pushNetwork: 'testnet',              // Push Chain network
  pushChainRpcUrl: 'https://...',      // Custom RPC URL
  
  // === Contract Settings ===
  facilitatorAddress: '0x...',         // Custom facilitator contract
  chainId: 42101,                      // Push Chain ID
  
  // === Callbacks ===
  onPaymentStatus: (status) => {       // Payment status updates
    console.log('Payment:', status);
  },
  
  // === Debug ===
  debug: true,                         // Enable debug logging
});`}
                    title="Full Configuration"
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Network Presets</h2>
                  <CodeBlock 
                    code={`// Testnet (default)
const client = createX402Client({
  network: 'push-testnet',
  walletProvider: window.ethereum,
});

// Mainnet (coming soon)
const client = createX402Client({
  network: 'push-mainnet',
  walletProvider: window.ethereum,
});`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Environment Variables</h2>
                  <CodeBlock 
                    code={`# .env
PUSH_X402_PRIVATE_KEY=your-private-key
PUSH_X402_CHAIN_ID=42101
PUSH_X402_RPC_URL=https://evm.donut.rpc.push.org/
PUSH_X402_NETWORK=testnet`}
                    language="bash"
                    title=".env"
                  />
                </article>
              )}

              {activeSection === 'usage' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Basic Usage</h1>
                  <p className="text-xl text-gray-600 mb-8">The SDK is a drop-in replacement for axios with automatic payment handling.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Making Requests</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

const client = createX402Client({
  walletProvider: window.ethereum,
});

// GET request
const response = await client.get('/api/protected/data');

// POST request
const result = await client.post('/api/protected/action', {
  data: 'your-data',
});

// With custom headers
const custom = await client.get('/api/protected/custom', {
  headers: { 'X-Custom-Header': 'value' },
});`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Handling Payment Status</h2>
                  <CodeBlock 
                    code={`const client = createX402Client({
  walletProvider: window.ethereum,
  onPaymentStatus: (status) => {
    // Update your UI with payment progress
    switch (status) {
      case 'Checking token allowance...':
        setLoading('Preparing payment...');
        break;
      case 'Transaction sent, waiting for confirmation...':
        setLoading('Confirming on chain...');
        break;
      default:
        console.log(status);
    }
  },
});`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Error Handling</h2>
                  <CodeBlock 
                    code={`import { createX402Client, X402Error, X402ErrorCode } from 'push-x402';

try {
  const response = await client.get('/api/protected/resource');
} catch (error) {
  if (error instanceof X402Error) {
    switch (error.code) {
      case X402ErrorCode.INSUFFICIENT_FUNDS:
        alert('Not enough balance for payment');
        break;
      case X402ErrorCode.TRANSACTION_FAILED:
        alert('Transaction failed. Please try again.');
        break;
      case X402ErrorCode.PAYMENT_METHOD_NOT_AVAILABLE:
        alert('Please connect your wallet first');
        break;
      default:
        alert(\`Payment error: \${error.message}\`);
    }
  }
}`}
                  />
                </article>
              )}

              {activeSection === 'browser-wallet' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Browser Wallet Integration</h1>
                  <p className="text-xl text-gray-600 mb-8">Accept payments directly from user wallets like MetaMask.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Basic Setup</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';
import { ethers } from 'ethers';

// Option 1: Direct window.ethereum
const client = createX402Client({
  walletProvider: window.ethereum,
});

// Option 2: With ethers BrowserProvider
const provider = new ethers.BrowserProvider(window.ethereum);
const client = createX402Client({
  walletProvider: provider,
});`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">React Hook Example</h2>
                  <CodeBlock 
                    code={`import { useState, useEffect } from 'react';
import { createX402Client } from 'push-x402';

function useX402Client() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const x402 = createX402Client({
        walletProvider: window.ethereum,
        onPaymentStatus: (status) => console.log(status),
      });
      setClient(x402);
      setConnected(true);
    }
  }, []);

  return { client, connected };
}

// Usage in component
function MyComponent() {
  const { client, connected } = useX402Client();

  const fetchData = async () => {
    if (!client) return;
    const response = await client.get('/api/premium/data');
    console.log(response.data);
  };

  return (
    <button onClick={fetchData} disabled={!connected}>
      {connected ? 'Fetch Premium Data' : 'Connect Wallet'}
    </button>
  );
}`}
                  />

                  <Callout type="warning" title="Network Requirement">
                    For direct payments, ensure your wallet is connected to Push Chain Testnet (chainId: 42101).
                    For cross-chain payments, use Universal Transaction mode.
                  </Callout>
                </article>
              )}

              {activeSection === 'server-side' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Server-Side / Agent Payments</h1>
                  <p className="text-xl text-gray-600 mb-8">Enable autonomous payments for AI agents and backend services.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Private Key Setup</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

const client = createX402Client({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  pushNetwork: 'testnet',
});

// Agent can now make autonomous payments
async function fetchPremiumData() {
  const response = await client.get('https://api.example.com/ai/data');
  return response.data;
}`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">AI Agent Example</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

class AIAgent {
  private client;

  constructor(privateKey: string) {
    this.client = createX402Client({
      privateKey,
      onPaymentStatus: (status) => {
        console.log(\`[Agent] Payment: \${status}\`);
      },
    });
  }

  async queryPaidAPI(endpoint: string) {
    try {
      const response = await this.client.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
}

// Usage
const agent = new AIAgent(process.env.AGENT_WALLET_KEY);
const data = await agent.queryPaidAPI('/api/premium/inference');`}
                  />

                  <Callout type="info" title="Funding the Agent Wallet">
                    Ensure your agent&apos;s wallet has sufficient Push Chain tokens (PC) for payments.
                    For testnet, get tokens from the Push Chain faucet.
                  </Callout>
                </article>
              )}

              {activeSection === 'universal-tx' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Universal Transaction</h1>
                  <p className="text-xl text-gray-600 mb-8">Pay from any chain without bridging or wrapping tokens.</p>

                  <Callout type="success" title="Cross-Chain Magic">
                    Universal Transaction lets users pay from Ethereum, Base, Arbitrum, Solana, and more.
                    No need to bridge tokens - Push Chain handles it automatically!
                  </Callout>

                  <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">How It Works</h2>
                  <div className="flex flex-wrap items-center justify-center gap-4 p-6 bg-white rounded-2xl border border-gray-200 mb-8">
                    {[
                      { title: 'Your Chain', desc: 'ETH, Base, Arbitrum, etc.' },
                      { title: 'Universal Tx', desc: 'Auto bridging' },
                      { title: 'Push Chain', desc: 'Payment processed' },
                    ].map((step, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="text-center px-4 py-3 bg-purple-50 rounded-xl border border-purple-200">
                          <div className="font-medium text-gray-900">{step.title}</div>
                          <div className="text-xs text-gray-500">{step.desc}</div>
                        </div>
                        {i < 2 && <span className="text-purple-400 text-xl">→</span>}
                      </div>
                    ))}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Enable Universal Transaction</h2>
                  <CodeBlock 
                    code={`import { createX402Client } from 'push-x402';

const client = createX402Client({
  walletProvider: window.ethereum,
  pushNetwork: 'testnet',  // Enables Universal Tx
});

// Now payments work from any connected chain!
// User can be on Ethereum Sepolia, Base Sepolia, etc.
const response = await client.get('/api/premium/data');`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Supported Source Chains</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chain</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Chain ID</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr><td className="px-4 py-3 text-sm">Push Chain Testnet</td><td className="px-4 py-3 text-sm font-mono">42101</td><td className="px-4 py-3 text-sm text-green-600">✅ Direct</td></tr>
                        <tr><td className="px-4 py-3 text-sm">Ethereum Sepolia</td><td className="px-4 py-3 text-sm font-mono">11155111</td><td className="px-4 py-3 text-sm text-purple-600">✅ Via Universal Tx</td></tr>
                        <tr><td className="px-4 py-3 text-sm">Base Sepolia</td><td className="px-4 py-3 text-sm font-mono">84532</td><td className="px-4 py-3 text-sm text-purple-600">✅ Via Universal Tx</td></tr>
                        <tr><td className="px-4 py-3 text-sm">Arbitrum Sepolia</td><td className="px-4 py-3 text-sm font-mono">421614</td><td className="px-4 py-3 text-sm text-purple-600">✅ Via Universal Tx</td></tr>
                        <tr><td className="px-4 py-3 text-sm">BNB Testnet</td><td className="px-4 py-3 text-sm font-mono">97</td><td className="px-4 py-3 text-sm text-purple-600">✅ Via Universal Tx</td></tr>
                        <tr><td className="px-4 py-3 text-sm">Solana Devnet</td><td className="px-4 py-3 text-sm font-mono">-</td><td className="px-4 py-3 text-sm text-purple-600">✅ Via Universal Tx</td></tr>
                      </tbody>
                    </table>
                  </div>
                </article>
              )}

              {activeSection === 'tokens' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Supported Tokens</h1>
                  <p className="text-xl text-gray-600 mb-8">PRC-20 tokens available for payments on Push Chain.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Ethereum Sepolia Tokens</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-xl overflow-hidden border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Token</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Symbol</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Address on Push Chain</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr><td className="px-4 py-3 text-sm">Wrapped ETH</td><td className="px-4 py-3 text-sm font-medium">pETH</td><td className="px-4 py-3 text-sm font-mono text-purple-600">0x2971...5809</td></tr>
                        <tr><td className="px-4 py-3 text-sm">WETH</td><td className="px-4 py-3 text-sm font-medium">WETH.eth</td><td className="px-4 py-3 text-sm font-mono text-purple-600">0x0d0d...7586</td></tr>
                        <tr><td className="px-4 py-3 text-sm">USDT</td><td className="px-4 py-3 text-sm font-medium">USDT.eth</td><td className="px-4 py-3 text-sm font-mono text-purple-600">0xCA0C...F9d3</td></tr>
                        <tr><td className="px-4 py-3 text-sm">USDC</td><td className="px-4 py-3 text-sm font-medium">USDC.eth</td><td className="px-4 py-3 text-sm font-mono text-purple-600">0x387b...d68E</td></tr>
                        <tr><td className="px-4 py-3 text-sm">stETH</td><td className="px-4 py-3 text-sm font-medium">stETH.eth</td><td className="px-4 py-3 text-sm font-mono text-purple-600">0xaf89...68E</td></tr>
                      </tbody>
                    </table>
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Using Tokens in Payments</h2>
                  <CodeBlock 
                    code={`// Server-side: Specify token in payment requirements
app.get('/api/premium', (req, res) => {
  res.status(402).json({
    message: 'Payment Required',
    paymentRequirements: {
      recipient: '0xYourAddress',
      amount: '1.0',
      token: '0x387b9C8Db60E74999aAAC5A2b7825b400F12d68E', // USDC.eth
    },
  });
});`}
                  />

                  <Callout type="tip">
                    For best compatibility, use native PC token (no token address).
                    Token payments require users to have the specific PRC-20 token on Push Chain.
                  </Callout>
                </article>
              )}

              {activeSection === 'api-reference' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">API Reference</h1>
                  <p className="text-xl text-gray-600 mb-8">Complete reference for all SDK exports.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">createX402Client(config)</h2>
                  <p className="text-gray-600 mb-4">Creates an axios instance with automatic 402 payment handling.</p>
                  <CodeBlock 
                    code={`interface X402ClientConfig {
  // Payment Methods
  walletProvider?: any;           // Browser wallet provider
  privateKey?: string;            // Private key for server-side
  universalSigner?: any;          // Pre-created universal signer
  viemClient?: ViemWalletClient;  // Viem wallet client
  solanaKeypair?: SolanaKeypair;  // Solana keypair

  // Network
  network?: 'push-testnet' | 'push-mainnet';
  pushNetwork?: 'testnet' | 'mainnet';
  pushChainRpcUrl?: string;
  chainId?: number;

  // Contract
  facilitatorAddress?: string;

  // Callbacks
  onPaymentStatus?: (status: string) => void;

  // Debug
  debug?: boolean;
  baseURL?: string;
}`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">X402ClientBuilder</h2>
                  <p className="text-gray-600 mb-4">Fluent builder pattern for client configuration.</p>
                  <CodeBlock 
                    code={`import { X402ClientBuilder } from 'push-x402';

const client = X402ClientBuilder
  .forTestnet()
  .withWallet(window.ethereum)
  .withStatusCallback((status) => console.log(status))
  .withDebug(true)
  .build();`}
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Error Codes</h2>
                  <CodeBlock 
                    code={`enum X402ErrorCode {
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_PAYMENT_REQUIREMENTS = 'INVALID_PAYMENT_REQUIREMENTS',
  PAYMENT_METHOD_NOT_AVAILABLE = 'PAYMENT_METHOD_NOT_AVAILABLE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}`}
                  />
                </article>
              )}

              {activeSection === 'examples' && (
                <article>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">Examples</h1>
                  <p className="text-xl text-gray-600 mb-8">Real-world examples and use cases.</p>

                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Next.js App Router</h2>
                  <CodeBlock 
                    code={`'use client';
import { createX402Client } from 'push-x402';
import { useState } from 'react';

export default function PremiumPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPremiumContent = async () => {
    setLoading(true);
    try {
      const client = createX402Client({
        walletProvider: window.ethereum,
        onPaymentStatus: (s) => console.log(s),
      });
      
      const response = await client.get('/api/premium/content');
      setData(response.data);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={fetchPremiumContent} disabled={loading}>
        {loading ? 'Processing...' : 'Access Premium Content'}
      </button>
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}`}
                    title="app/premium/page.tsx"
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Express.js API with Payment</h2>
                  <CodeBlock 
                    code={`import express from 'express';

const app = express();

// Middleware to check for payment
function requirePayment(amount: string, recipient: string) {
  return (req, res, next) => {
    const paymentProof = req.headers['x-payment'];
    
    if (!paymentProof) {
      return res.status(402).json({
        message: 'Payment Required',
        paymentRequirements: {
          recipient,
          amount,
          chainId: 42101,
          facilitator: '0x30C833dB38be25869B20FdA61f2ED97196Ad4aC7',
        },
      });
    }

    // Verify payment proof on-chain here
    next();
  };
}

app.get('/api/premium', 
  requirePayment('0.001', '0xYourWallet'),
  (req, res) => {
    res.json({ data: 'Premium content!', timestamp: Date.now() });
  }
);

app.listen(3000);`}
                    title="server.ts"
                  />

                  <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">AI Agent with Budget</h2>
                  <CodeBlock 
                    code={`import { createX402Client, X402Error, X402ErrorCode } from 'push-x402';

class BudgetedAgent {
  private client;
  private spent = 0;
  private budget: number;

  constructor(privateKey: string, budgetInETH: number) {
    this.budget = budgetInETH;
    this.client = createX402Client({
      privateKey,
      onPaymentStatus: (status) => {
        if (status.includes('confirmed')) {
          this.spent += 0.001; // Track spending
        }
      },
    });
  }

  async query(endpoint: string) {
    if (this.spent >= this.budget) {
      throw new Error('Budget exceeded');
    }
    return await this.client.get(endpoint);
  }

  getSpent() { return this.spent; }
}

// Usage
const agent = new BudgetedAgent(process.env.KEY, 0.1);
await agent.query('/api/data');
console.log(\`Spent: \${agent.getSpent()} ETH\`);`}
                    title="budgeted-agent.ts"
                  />
                </article>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
