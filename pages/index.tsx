import Layout from '../src/components/Layout';
import Hero from '../src/components/Hero';
import WhyPushChain from '../src/components/WhyPushChain';
import Features from '../src/components/Features';
import SdkInstall from '../src/components/SdkInstall';

export default function Home() {
  return (
    <Layout>
      <Hero />
      <WhyPushChain />
      <Features />
      <SdkInstall />
    </Layout>
  );
}
