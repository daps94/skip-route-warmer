import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Coin } from '@cosmjs/stargate';
import { ChainInfo } from '@keplr-wallet/types';
import { api } from '../util/api';
import { formatDisplayAmount } from '../util/formatters';
import { getTokenMetadata, preloadTokenMetadata } from '../util/tokenMetadata';
import './BalanceDropdown.css';

interface BalanceDropdownProps {
  chainInfo: ChainInfo | null;
  address: string;
  selectedDenom: string;
  onDenomSelect: (denom: string) => void;
  humanReadableMode?: boolean;
  manualDecimals?: Record<string, number>;
}

interface TokenInfo {
  denom: string;
  amount: string;
  symbol?: string;
  decimals?: number;
  displayAmount?: string;
}

const BalanceDropdown: React.FC<BalanceDropdownProps> = ({
  chainInfo,
  address,
  selectedDenom,
  onDenomSelect,
  humanReadableMode = false,
  manualDecimals = {},
}) => {
  const [balances, setBalances] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [customDenom, setCustomDenom] = useState('');
  const [queryingCustom, setQueryingCustom] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Preload token metadata when chain changes
  useEffect(() => {
    if (chainInfo) {
      preloadTokenMetadata(chainInfo).catch(console.error);
    }
  }, [chainInfo]);

  // Fetch balances when chain or address changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!chainInfo || !address) {
        console.log('Cannot fetch balances - missing chainInfo or address:', { chainInfo: chainInfo?.chainId, address });
        setBalances([]);
        return;
      }

      console.log('Fetching balances with:', {
        chainId: chainInfo.chainId,
        rest: chainInfo.rest,
        address,
        timestamp: new Date().toISOString()
      });

      setLoading(true);
      setError('');

      try {
        // Primary endpoint
        let response;
        try {
          const url = `${chainInfo.rest}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=1000`;
          console.log('Attempting to fetch from primary URL:', url);
          response = await api<{ balances: Coin[] }>(url);
        } catch (primaryError) {
          console.error('Primary endpoint failed:', primaryError);
          // Fallback endpoint without pagination
          const fallbackUrl = `${chainInfo.rest}/cosmos/bank/v1beta1/balances/${address}`;
          console.log('Attempting fallback URL:', fallbackUrl);
          response = await api<{ balances: Coin[] }>(fallbackUrl);
        }

        const fetchedBalances = response.balances || [];
        
        // Filter out zero balances and get token metadata
        const nonZeroBalances = fetchedBalances.filter(balance => balance.amount !== '0');
        
        // Get metadata for all tokens in parallel
        const unsortedBalances: TokenInfo[] = await Promise.all(
          nonZeroBalances.map(async (balance) => {
            // Try to find asset info from chain currencies first (faster)
            const currency = chainInfo.currencies.find(
              c => c.coinMinimalDenom === balance.denom
            );

            if (currency) {
              const decimals = manualDecimals[balance.denom] ?? currency.coinDecimals;
              const displayAmount = humanReadableMode 
                ? formatDisplayAmount(balance.amount, decimals, true)
                : balance.amount;
              return {
                denom: balance.denom,
                amount: balance.amount,
                symbol: currency.coinDenom,
                decimals: decimals,
                displayAmount,
              };
            }

            // For unknown denoms, query the chain
            try {
              const metadata = await getTokenMetadata(balance.denom, chainInfo);
              const decimals = manualDecimals[balance.denom] ?? metadata.decimals;
              const displayAmount = humanReadableMode 
                ? formatDisplayAmount(balance.amount, decimals, true)
                : balance.amount;
              return {
                denom: balance.denom,
                amount: balance.amount,
                symbol: metadata.symbol,
                decimals: decimals,
                displayAmount,
              };
            } catch (error) {
              // Fallback for tokens where metadata query fails
              console.warn(`Failed to get metadata for ${balance.denom}:`, error);
              const decimals = manualDecimals[balance.denom] ?? 6; // Default to 6 decimals
              return {
                denom: balance.denom,
                amount: balance.amount,
                displayAmount: humanReadableMode 
                  ? formatDisplayAmount(balance.amount, decimals, true)
                  : balance.amount,
                symbol: balance.denom,
                decimals: decimals,
              };
            }
          })
        );
        
        // Sort by amount (descending)
        const formattedBalances = unsortedBalances.sort((a, b) => {
          const amountA = BigInt(a.amount);
          const amountB = BigInt(b.amount);
          if (amountB > amountA) return 1;
          if (amountB < amountA) return -1;
          return 0;
        });

        setBalances(formattedBalances);
        console.log('Successfully fetched', formattedBalances.length, 'balances');
      } catch (err) {
        console.error('Failed to fetch balances:', {
          error: err,
          chainId: chainInfo?.chainId,
          rest: chainInfo?.rest,
          address
        });
        setError('Failed to fetch balances. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [chainInfo, address, humanReadableMode, manualDecimals, refreshTrigger]);

  // Query custom denom balance
  const queryCustomDenom = async () => {
    if (!customDenom || !chainInfo || !address) return;

    setQueryingCustom(true);
    try {
      const response = await api<{ balance: Coin }>(
        `${chainInfo.rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${encodeURIComponent(customDenom)}`
      );

      if (response.balance && response.balance.amount !== '0') {
        // Try to find asset info for custom denom
        const currency = chainInfo.currencies.find(
          c => c.coinMinimalDenom === response.balance.denom
        );
        
        let newToken: TokenInfo;
        if (currency) {
          const decimals = manualDecimals[response.balance.denom] ?? currency.coinDecimals;
          newToken = {
            denom: response.balance.denom,
            amount: response.balance.amount,
            symbol: currency.coinDenom,
            decimals: decimals,
            displayAmount: humanReadableMode
              ? formatDisplayAmount(response.balance.amount, decimals, true)
              : response.balance.amount,
          };
        } else {
          // Query metadata for unknown denom
          try {
            const metadata = await getTokenMetadata(response.balance.denom, chainInfo);
            const decimals = manualDecimals[response.balance.denom] ?? metadata.decimals;
            newToken = {
              denom: response.balance.denom,
              amount: response.balance.amount,
              symbol: metadata.symbol,
              decimals: decimals,
              displayAmount: humanReadableMode
                ? formatDisplayAmount(response.balance.amount, decimals, true)
                : response.balance.amount,
            };
          } catch (error) {
            console.warn(`Failed to get metadata for custom denom ${response.balance.denom}:`, error);
            const decimals = manualDecimals[response.balance.denom] ?? 6;
            newToken = {
              denom: response.balance.denom,
              amount: response.balance.amount,
              symbol: response.balance.denom,
              decimals: decimals,
              displayAmount: humanReadableMode
                ? formatDisplayAmount(response.balance.amount, decimals, true)
                : response.balance.amount,
            };
          }
        }

        // Add to balances if not already present
        setBalances(prev => {
          const exists = prev.find(b => b.denom === newToken.denom);
          if (!exists) {
            return [newToken, ...prev];
          }
          return prev;
        });

        // Select the custom denom
        onDenomSelect(response.balance.denom);
        setCustomDenom('');
        setShowDropdown(false);
      } else {
        setError('No balance found for this denom');
      }
    } catch (err) {
      console.error('Failed to query custom denom:', err);
      setError('Failed to query custom denom');
    } finally {
      setQueryingCustom(false);
    }
  };


  const selectedToken = balances.find(b => b.denom === selectedDenom);

  // Manual refresh function
  const refreshBalances = useCallback(() => {
    if (!chainInfo || !address) return;
    
    console.log('Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  }, [chainInfo, address]);

  return (
    <div className="balance-dropdown" ref={dropdownRef}>
      <label>
        <span>Token</span>
        {!loading && chainInfo && address && (
          <button
            className="refresh-button"
            onClick={(e) => {
              e.stopPropagation();
              refreshBalances();
            }}
            title="Refresh balances"
          >
            ↻
          </button>
        )}
      </label>
      <div
        className="dropdown-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        {loading ? (
          <span className="loading-text">Loading balances...</span>
        ) : selectedToken ? (
          <div className="selected-token">
            <span className="token-symbol">
              {selectedToken.symbol || selectedToken.denom}
            </span>
            <span className="token-balance">
              Balance: {selectedToken.displayAmount} {!humanReadableMode && selectedToken.symbol}
            </span>
          </div>
        ) : (
          <span className="placeholder">Select token</span>
        )}
        <span className="dropdown-arrow">▼</span>
      </div>

      {showDropdown && (
        <div className="dropdown-menu">
          {/* Custom denom input */}
          <div className="custom-denom-section">
            <input
              type="text"
              className="custom-denom-input"
              placeholder="Enter custom denom (e.g., ibc/...)"
              value={customDenom}
              onChange={(e) => setCustomDenom(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && queryCustomDenom()}
            />
            <button
              className="query-button"
              onClick={queryCustomDenom}
              disabled={!customDenom || queryingCustom}
            >
              {queryingCustom ? 'Querying...' : 'Query'}
            </button>
          </div>

          {error && (
            <div className="dropdown-error">{error}</div>
          )}

          <div className="dropdown-options">
            {balances.length === 0 ? (
              <div className="no-balances">
                {loading ? 'Loading...' : 'No balances found'}
              </div>
            ) : (
              balances.map((token) => (
                <div
                  key={token.denom}
                  className={`dropdown-option ${selectedDenom === token.denom ? 'selected' : ''}`}
                  onClick={() => {
                    onDenomSelect(token.denom);
                    setShowDropdown(false);
                  }}
                >
                  <div className="token-info">
                    <span className="token-name">
                      {token.symbol || token.denom}
                    </span>
                    <span className="token-denom">{token.denom}</span>
                  </div>
                  <span className="token-amount">
                    {token.displayAmount}
                    {!humanReadableMode && token.symbol && ` ${token.symbol}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDropdown;