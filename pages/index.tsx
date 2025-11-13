export default function Home() {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Push Chain x402 Payment Protocol</h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
        A complete implementation of the x402 Payment Protocol for Push Chain
      </p>
      
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Available APIs</h2>
        <ul style={{ lineHeight: '1.8' }}>
          <li><strong>Facilitator API:</strong> <code>/api/facilitator/info</code></li>
          <li><strong>Indexer API:</strong> <code>/api/indexer/tx?hash=0x...</code></li>
          <li><strong>Payment API:</strong> <code>/api/payment/process</code></li>
        </ul>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3 style={{ marginTop: '0' }}>SDK Installation</h3>
        <pre style={{ backgroundColor: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`npm install @pushchain/x402-sdk axios`}
        </pre>
        <p style={{ marginTop: '1rem', marginBottom: '0' }}>
          See <a href="https://www.npmjs.com/package/@pushchain/x402-sdk" target="_blank" rel="noopener noreferrer">@pushchain/x402-sdk</a> for documentation.
        </p>
      </div>
    </div>
  );
}

