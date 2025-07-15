import { api } from './api';
import { ChainInfo } from '@keplr-wallet/types';

export interface DenomUnit {
  denom: string;
  exponent: number;
  aliases?: string[];
}

export interface DenomMetadata {
  description?: string;
  denom_units: DenomUnit[];
  base: string;
  display: string;
  name?: string;
  symbol?: string;
  uri?: string;
  uri_hash?: string;
}

export interface TokenMetadata {
  denom: string;
  symbol: string;
  decimals: number;
  name?: string;
  description?: string;
}

// Cache for token metadata to avoid repeated queries
const metadataCache = new Map<string, TokenMetadata>();

/**
 * Query token metadata from the chain's bank module
 */
export const queryDenomMetadata = async (
  chainInfo: ChainInfo,
  denom: string
): Promise<DenomMetadata | null> => {
  try {
    const response = await api<{ metadata: DenomMetadata }>(
      `${chainInfo.rest}/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(denom)}`
    );
    return response.metadata;
  } catch (error) {
    console.warn(`Failed to query metadata for ${denom}:`, error);
    return null;
  }
};

/**
 * Query all available denom metadata from the chain
 */
export const queryAllDenomMetadata = async (
  chainInfo: ChainInfo
): Promise<DenomMetadata[]> => {
  try {
    const response = await api<{ metadatas: DenomMetadata[] }>(
      `${chainInfo.rest}/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=1000`
    );
    return response.metadatas || [];
  } catch (error) {
    console.warn('Failed to query all denom metadata:', error);
    return [];
  }
};

/**
 * Parse IBC denom to extract base information
 */
export const parseIBCDenom = (denom: string): { isIBC: boolean; hash?: string } => {
  const ibcPattern = /^ibc\/([A-F0-9]{64})$/;
  const match = denom.match(ibcPattern);
  
  if (match) {
    return { isIBC: true, hash: match[1] };
  }
  
  return { isIBC: false };
};

/**
 * Get token metadata with proper decimals, either from chain info, chain query, or cache
 */
export const getTokenMetadata = async (
  denom: string,
  chainInfo: ChainInfo | null
): Promise<TokenMetadata> => {
  // Check cache first
  const cacheKey = `${chainInfo?.chainId || 'unknown'}_${denom}`;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }

  // Default fallback values
  let metadata: TokenMetadata = {
    denom,
    symbol: denom,
    decimals: 6, // Default to 6 decimals
  };

  if (!chainInfo) {
    return metadata;
  }

  // First, check if it's in the chain's currency list
  const currency = chainInfo.currencies.find(c => c.coinMinimalDenom === denom);
  if (currency) {
    metadata = {
      denom,
      symbol: currency.coinDenom,
      decimals: currency.coinDecimals,
    };
    metadataCache.set(cacheKey, metadata);
    return metadata;
  }

  // If not found in currencies, query the chain's bank module
  try {
    const denomMetadata = await queryDenomMetadata(chainInfo, denom);
    if (denomMetadata) {
      // Find the display unit to get the correct decimals
      const baseUnit = denomMetadata.denom_units.find(unit => unit.denom === denomMetadata.base);
      const displayUnit = denomMetadata.denom_units.find(unit => unit.denom === denomMetadata.display);
      
      if (baseUnit && displayUnit) {
        const decimals = displayUnit.exponent - baseUnit.exponent;
        metadata = {
          denom,
          symbol: denomMetadata.symbol || denomMetadata.display || denom,
          decimals: decimals >= 0 ? decimals : 6,
          name: denomMetadata.name,
          description: denomMetadata.description,
        };
        metadataCache.set(cacheKey, metadata);
        return metadata;
      }
    }
  } catch (error) {
    console.warn(`Failed to get metadata for ${denom}:`, error);
  }

  // For IBC denoms, we could potentially trace back to the original chain
  // but that's complex and requires additional infrastructure
  const { isIBC } = parseIBCDenom(denom);
  if (isIBC) {
    // For now, we'll use common defaults for IBC tokens
    // In a production app, you'd want to trace the IBC denom to its source
    console.info(`IBC token detected: ${denom}. Using default decimals.`);
  }

  // Cache the default metadata
  metadataCache.set(cacheKey, metadata);
  return metadata;
};

/**
 * Batch query token metadata for multiple denoms
 */
export const batchGetTokenMetadata = async (
  denoms: string[],
  chainInfo: ChainInfo | null
): Promise<Map<string, TokenMetadata>> => {
  const result = new Map<string, TokenMetadata>();
  
  // Use Promise.all for parallel queries
  const metadataPromises = denoms.map(async (denom) => {
    const metadata = await getTokenMetadata(denom, chainInfo);
    return { denom, metadata };
  });
  
  const results = await Promise.all(metadataPromises);
  results.forEach(({ denom, metadata }) => {
    result.set(denom, metadata);
  });
  
  return result;
};

/**
 * Clear the metadata cache
 */
export const clearMetadataCache = () => {
  metadataCache.clear();
};

/**
 * Pre-populate cache with all available metadata from the chain
 */
export const preloadTokenMetadata = async (chainInfo: ChainInfo): Promise<void> => {
  try {
    const allMetadata = await queryAllDenomMetadata(chainInfo);
    
    allMetadata.forEach(denomMetadata => {
      const baseUnit = denomMetadata.denom_units.find(unit => unit.denom === denomMetadata.base);
      const displayUnit = denomMetadata.denom_units.find(unit => unit.denom === denomMetadata.display);
      
      if (baseUnit && displayUnit) {
        const decimals = displayUnit.exponent - baseUnit.exponent;
        const metadata: TokenMetadata = {
          denom: denomMetadata.base,
          symbol: denomMetadata.symbol || denomMetadata.display || denomMetadata.base,
          decimals: decimals >= 0 ? decimals : 6,
          name: denomMetadata.name,
          description: denomMetadata.description,
        };
        
        const cacheKey = `${chainInfo.chainId}_${denomMetadata.base}`;
        metadataCache.set(cacheKey, metadata);
      }
    });
    
    console.log(`Preloaded ${allMetadata.length} token metadata entries for ${chainInfo.chainId}`);
  } catch (error) {
    console.warn('Failed to preload token metadata:', error);
  }
};