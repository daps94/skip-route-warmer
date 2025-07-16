import { ChainInfo } from "@keplr-wallet/types";
import { API_OVERRIDE } from "./constants";

/**
 * RPC Client Manager
 * 
 * Prioritizes Skip's RPC endpoints (https://go.skip.build/api/rpc/{chain-id})
 * which are maintained and whitelisted for CORS access.
 * Falls back to other endpoints if Skip's endpoint is unavailable.
 */

interface RpcEndpoint {
  url: string;
  priority: number;
  isHealthy: boolean;
  lastChecked: number;
}

class RpcClientManager {
  private rpcEndpoints: Map<string, RpcEndpoint[]> = new Map();
  private restEndpoints: Map<string, RpcEndpoint[]> = new Map();
  private healthCheckInterval = 30000; // 30 seconds
  private requestTimeout = 10000; // 10 seconds

  /**
   * Get available RPC endpoints for a chain
   */
  private getRpcEndpointsForChain(chainId: string): string[] {
    // Priority order: Skip RPC -> API_OVERRIDE -> fallbacks
    const endpoints: string[] = [];

    // Add Skip's RPC endpoint first (highest priority)
    endpoints.push(`https://go.skip.build/api/rpc/${chainId}`);

    // Add override endpoints second
    if (API_OVERRIDE[chainId]) {
      endpoints.push(API_OVERRIDE[chainId].rpc);
    }

    // Add common fallback endpoints
    const fallbackEndpoints: Record<string, string[]> = {
      "osmosis-1": [
        "https://rpc.osmosis.zone",
        "https://osmosis-rpc.polkachu.com",
        "https://rpc-osmosis.blockapsis.com",
        "https://osmosis.rpc.m.stavr.tech"
      ],
      "cosmoshub-4": [
        "https://rpc.cosmos.network",
        "https://cosmos-rpc.polkachu.com",
        "https://rpc-cosmoshub.blockapsis.com",
        "https://cosmos.rpc.m.stavr.tech",
        "https://cosmos-rpc.publicnode.com",
        "https://rpc.cosmoshub.io"
      ],
      "neutron-1": [
        "https://rpc-neutron.whispernode.com",
        "https://neutron-rpc.polkachu.com",
        "https://rpc-kralum.neutron-1.neutron.org"
      ],
      "stride-1": [
        "https://stride-rpc.polkachu.com",
        "https://stride.rpc.m.stavr.tech",
        "https://rpc.stride.zone"
      ],
      "axelar-dojo-1": [
        "https://axelar-rpc.polkachu.com",
        "https://axelar.rpc.m.stavr.tech",
        "https://rpc-axelar.imperator.co"
      ]
    };

    if (fallbackEndpoints[chainId]) {
      endpoints.push(...fallbackEndpoints[chainId]);
    }

    // Remove duplicates
    return Array.from(new Set(endpoints));
  }

  /**
   * Get available REST endpoints for a chain
   */
  private getRestEndpointsForChain(chainId: string): string[] {
    // Priority order: API_OVERRIDE -> chain-registry -> default
    const endpoints: string[] = [];

    // Add override endpoints first
    if (API_OVERRIDE[chainId]) {
      endpoints.push(API_OVERRIDE[chainId].rest);
    }

    // Add common fallback endpoints
    const fallbackEndpoints: Record<string, string[]> = {
      "osmosis-1": [
        "https://lcd.osmosis.zone",
        "https://osmosis-api.polkachu.com",
        "https://api-osmosis.blockapsis.com",
        "https://osmosis.api.m.stavr.tech"
      ],
      "cosmoshub-4": [
        "https://api.cosmos.network",
        "https://rest.cosmos.network",
        "https://cosmos-api.polkachu.com",
        "https://api-cosmoshub.blockapsis.com",
        "https://cosmos.api.m.stavr.tech",
        "https://cosmos-rest.publicnode.com",
        "https://api.cosmoshub.io"
      ],
      "neutron-1": [
        "https://lcd-neutron.whispernode.com",
        "https://neutron-api.polkachu.com",
        "https://api-kralum.neutron-1.neutron.org"
      ],
      "stride-1": [
        "https://stride-api.polkachu.com",
        "https://stride.api.m.stavr.tech",
        "https://api.stride.zone"
      ],
      "axelar-dojo-1": [
        "https://axelar-api.polkachu.com",
        "https://axelar.api.m.stavr.tech",
        "https://api-axelar.imperator.co"
      ]
    };

    if (fallbackEndpoints[chainId]) {
      endpoints.push(...fallbackEndpoints[chainId]);
    }

    // Remove duplicates
    return Array.from(new Set(endpoints));
  }

  /**
   * Initialize endpoints for a chain
   */
  private initializeEndpoints(chainId: string, endpointType: 'rpc' | 'rest' = 'rpc'): void {
    const urls = endpointType === 'rpc' 
      ? this.getRpcEndpointsForChain(chainId)
      : this.getRestEndpointsForChain(chainId);
    
    const endpoints: RpcEndpoint[] = urls.map((url, index) => ({
      url,
      priority: index,
      isHealthy: true,
      lastChecked: Date.now()
    }));
    
    if (endpointType === 'rpc') {
      this.rpcEndpoints.set(chainId, endpoints);
    } else {
      this.restEndpoints.set(chainId, endpoints);
    }
  }

  /**
   * Check health of an endpoint
   */
  private async checkEndpointHealth(endpoint: RpcEndpoint, chainId?: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // For RPC endpoints, check /status instead of /health
      const healthPath = endpoint.url.includes('rpc') ? '/status' : '/health';
      const response = await fetch(`${endpoint.url}${healthPath}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return false;
      }

      // For RPC status endpoint, verify chain ID if provided
      if (healthPath === '/status' && chainId) {
        try {
          const data = await response.json();
          if (data.result?.node_info?.network !== chainId) {
            console.log(`Chain ID mismatch for ${endpoint.url}: expected ${chainId}, got ${data.result?.node_info?.network}`);
            return false;
          }
        } catch {
          // If we can't parse the response, assume it's unhealthy
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get healthy endpoint for a chain
   */
  private async getHealthyEndpoint(chainId: string, endpointType: 'rpc' | 'rest' = 'rpc'): Promise<string | null> {
    const endpointsMap = endpointType === 'rpc' ? this.rpcEndpoints : this.restEndpoints;
    
    if (!endpointsMap.has(chainId)) {
      this.initializeEndpoints(chainId, endpointType);
    }

    const endpoints = endpointsMap.get(chainId)!;
    const now = Date.now();

    // Sort by priority and health
    const sortedEndpoints = [...endpoints].sort((a, b) => {
      if (a.isHealthy && !b.isHealthy) return -1;
      if (!a.isHealthy && b.isHealthy) return 1;
      return a.priority - b.priority;
    });

    // Find first healthy endpoint
    for (const endpoint of sortedEndpoints) {
      // Check if we need to recheck health
      if (now - endpoint.lastChecked > this.healthCheckInterval) {
        endpoint.isHealthy = await this.checkEndpointHealth(endpoint, chainId);
        endpoint.lastChecked = now;
      }

      if (endpoint.isHealthy) {
        return endpoint.url;
      }
    }

    // If no healthy endpoints, try to find one that works
    for (const endpoint of sortedEndpoints) {
      endpoint.isHealthy = await this.checkEndpointHealth(endpoint, chainId);
      endpoint.lastChecked = now;
      if (endpoint.isHealthy) {
        return endpoint.url;
      }
    }

    return null;
  }

  /**
   * Make API request with automatic failover
   */
  async request<T>(
    chainId: string,
    path: string,
    options?: RequestInit,
    endpointType: 'rpc' | 'rest' = 'rpc'
  ): Promise<T> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      const endpoint = await this.getHealthyEndpoint(chainId, endpointType);
      if (!endpoint) {
        throw new Error(`No healthy ${endpointType.toUpperCase()} endpoints available for chain ${chainId}`);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

        const response = await fetch(`${endpoint}${path}`, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error as Error;
        
        // Mark endpoint as unhealthy
        const endpointsMap = endpointType === 'rpc' ? this.rpcEndpoints : this.restEndpoints;
        const endpoints = endpointsMap.get(chainId)!;
        const failedEndpoint = endpoints.find(e => e.url === endpoint);
        if (failedEndpoint) {
          failedEndpoint.isHealthy = false;
          failedEndpoint.lastChecked = Date.now();
        }

        // If timeout or network error, try next endpoint
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
          continue;
        }
      }
    }

    throw lastError || new Error('Failed to make request after retries');
  }

  /**
   * Get chain info with fallback RPC endpoints
   */
  async getChainInfoWithFallback(chainInfo: ChainInfo): Promise<ChainInfo> {
    const chainId = chainInfo.chainId;
    const healthyRpc = await this.getHealthyEndpoint(chainId, 'rpc');
    const healthyRest = await this.getHealthyEndpoint(chainId, 'rest');

    if (!healthyRpc) {
      // If no healthy RPC found, default to Skip's endpoint
      console.log(`No healthy RPC endpoints found for ${chainId}, using Skip's endpoint`);
      return {
        ...chainInfo,
        rpc: `https://go.skip.build/api/rpc/${chainId}`,
        rest: healthyRest || chainInfo.rest
      };
    }

    if (!healthyRest) {
      console.log(`No healthy REST endpoints found for ${chainId}, using chain default`);
    }

    return {
      ...chainInfo,
      rpc: healthyRpc,
      rest: healthyRest || chainInfo.rest
    };
  }
}

// Export singleton instance
export const rpcClient = new RpcClientManager();

// Helper function for making resilient API calls
export async function makeResilientApiCall<T>(
  chainId: string,
  path: string,
  options?: RequestInit,
  endpointType: 'rpc' | 'rest' = 'rpc'
): Promise<T> {
  return rpcClient.request<T>(chainId, path, options, endpointType);
}