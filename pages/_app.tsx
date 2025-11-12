import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Script from 'next/script'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js" strategy="beforeInteractive" />
      <Component {...pageProps} />
    </>
  )
}

