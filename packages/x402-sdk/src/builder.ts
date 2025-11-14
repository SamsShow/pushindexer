import { createX402Client } from './client';
import type { X402ClientConfig } from './types';
import { getPresetConfig, type NetworkPreset } from './presets';
import type { AxiosInstance } from 'axios';

/**
 * Builder class for creating x402 clients with a fluent API
 * 
 * @example
 * ```typescript
 * const client = X402ClientBuilder
 *   .forTestnet()
 *   .withWallet(walletProvider)
 *   .withStatusCallback((status) => console.log(status))
 *   .build();
 * ```
 */
export class X402ClientBuilder {
  private config: Partial<X402ClientConfig> = {};

  /**
   * Create a builder instance for Push Chain testnet
   */
  static forTestnet(): X402ClientBuilder {
    const builder = new X402ClientBuilder();
    builder.config = { ...getPresetConfig('push-testnet') };
    return builder;
  }

  /**
   * Create a builder instance for Push Chain mainnet
   */
  static forMainnet(): X402ClientBuilder {
    const builder = new X402ClientBuilder();
    builder.config = { ...getPresetConfig('push-mainnet') };
    return builder;
  }

  /**
   * Create a builder instance with custom network preset
   */
  static forNetwork(network: NetworkPreset): X402ClientBuilder {
    const builder = new X402ClientBuilder();
    builder.config = { ...getPresetConfig(network) };
    return builder;
  }

  /**
   * Create a builder instance with custom configuration
   */
  static withConfig(config: Partial<X402ClientConfig>): X402ClientBuilder {
    const builder = new X402ClientBuilder();
    builder.config = { ...config };
    return builder;
  }

  /**
   * Set wallet provider for browser/client-side transactions
   */
  withWallet(walletProvider: any): X402ClientBuilder {
    this.config.walletProvider = walletProvider;
    return this;
  }

  /**
   * Set private key for server-side/agent transactions
   * ⚠️ WARNING: Only use in secure server-side environments!
   */
  withPrivateKey(privateKey: string): X402ClientBuilder {
    this.config.privateKey = privateKey;
    return this;
  }

  /**
   * Set Universal Signer for multi-chain support
   */
  withUniversalSigner(universalSigner: any): X402ClientBuilder {
    this.config.universalSigner = universalSigner;
    return this;
  }

  /**
   * Set payment status callback
   */
  withStatusCallback(callback: (status: string) => void): X402ClientBuilder {
    this.config.onPaymentStatus = callback;
    return this;
  }

  /**
   * Set base URL for API calls
   */
  withBaseURL(baseURL: string): X402ClientBuilder {
    this.config.baseURL = baseURL;
    return this;
  }

  /**
   * Set facilitator contract address
   */
  withFacilitatorAddress(address: string): X402ClientBuilder {
    this.config.facilitatorAddress = address;
    return this;
  }

  /**
   * Set chain ID
   */
  withChainId(chainId: number | string): X402ClientBuilder {
    this.config.chainId = chainId;
    return this;
  }

  /**
   * Set Push Chain RPC URL
   */
  withRpcUrl(rpcUrl: string): X402ClientBuilder {
    this.config.pushChainRpcUrl = rpcUrl;
    return this;
  }

  /**
   * Set chain RPC mapping for multi-chain support
   */
  withChainRpcMap(chainRpcMap: Record<string | number, string>): X402ClientBuilder {
    this.config.chainRpcMap = chainRpcMap;
    return this;
  }

  /**
   * Set custom payment endpoint
   */
  withPaymentEndpoint(endpoint: string): X402ClientBuilder {
    this.config.paymentEndpoint = endpoint;
    return this;
  }

  /**
   * Enable debug mode for detailed logging
   */
  withDebug(enabled: boolean = true): X402ClientBuilder {
    this.config.debug = enabled;
    return this;
  }

  /**
   * Set custom axios configuration
   */
  withAxiosConfig(axiosConfig: X402ClientConfig['axiosConfig']): X402ClientBuilder {
    this.config.axiosConfig = axiosConfig;
    return this;
  }

  /**
   * Build and return the configured x402 client
   * The createX402Client function will handle merging with defaults and env vars
   */
  build(): AxiosInstance {
    return createX402Client(this.config);
  }
}

