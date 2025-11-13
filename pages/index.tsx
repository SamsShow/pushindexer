import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/demo');
  }, [router]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Redirecting to demo...</p>
    </div>
  );
}

