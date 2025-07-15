import { useState, useEffect } from 'react';
import { ChainInfo } from '@keplr-wallet/types';
import { getTokenMetadata, TokenMetadata } from '../util/tokenMetadata';

export const useTokenMetadata = (denom: string, chainInfo: ChainInfo | null) => {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!denom || !chainInfo) {
      setMetadata(null);
      return;
    }

    let cancelled = false;

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getTokenMetadata(denom, chainInfo);
        if (!cancelled) {
          setMetadata(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch token metadata');
          // Set default metadata on error
          setMetadata({
            denom,
            symbol: denom,
            decimals: 6,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      cancelled = true;
    };
  }, [denom, chainInfo]);

  return { metadata, loading, error };
};

export default useTokenMetadata;