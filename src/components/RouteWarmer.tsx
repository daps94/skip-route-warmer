import React, { useState, useEffect, useCallback } from 'react';
import { Coin } from '@cosmjs/stargate';
import { MsgTransfer } from '@keplr-wallet/proto-types/ibc/applications/transfer/v1/tx';
import { Height } from '@keplr-wallet/proto-types/ibc/core/client/v1/client';
import { sendMsgs } from '../util/sendMsgs';
import { simulateMsgs } from '../util/simulateMsgs';
import { useChainInfo, useKeplrAddress } from '../util/hooks';
import { ChainInfo } from '@keplr-wallet/types';
import { rpcClient } from '../util/rpcClient';
// Import removed - no longer using Skip API for Eureka fee estimation
import { createEurekaExecuteContractMsg } from '../util/eurekaProtocolV2';
import { EUREKA_CONTRACT_ADDRESS } from '../util/eureka.constants';
import Tabs from './Tabs';
import BalanceDropdown from './BalanceDropdown';
import RouteVisualizer from './RouteVisualizer';
import TransactionTracker, { Transaction } from './TransactionTracker';
import { formatDisplayAmount, convertToSmallestUnit, getTokenInfo } from '../util/formatters';
import useTokenMetadata from '../hooks/useTokenMetadata';
import './RouteWarmer.css';

interface SkipChain {
  chain_id: string;
  chain_name: string;
  prefix: string;
  chain_type: string;
  is_testnet: boolean;
}

const RouteWarmer: React.FC = () => {
  // State management
  const [chains, setChains] = useState<SkipChain[]>([]);
  const [activeTab, setActiveTab] = useState<string>('ibc');
  const [sourceChainId, setSourceChainId] = useState<string>('');
  const [destinationChainId, setDestinationChainId] = useState<string>(''); // For IBC route selection
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [denom, setDenom] = useState<string>('');
  const [channel, setChannel] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingChains, setFetchingChains] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualFee, setManualFee] = useState<string>('0');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSourceDropdown, setShowSourceDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);
  const [prettyMode, setPrettyMode] = useState<boolean>(false);
  const [manualDecimals, setManualDecimals] = useState<Record<string, number>>({});
  const [showDecimalSettings, setShowDecimalSettings] = useState<boolean>(false);
  const [decimalInput, setDecimalInput] = useState<string>('');
  const [showTestnets, setShowTestnets] = useState<boolean>(false);

  // Hooks - Use Cosmos Hub for Eureka tab
  const effectiveSourceChainId = activeTab === 'eureka' ? 'cosmoshub-4' : sourceChainId;
  const chainInfo = useChainInfo(effectiveSourceChainId);
  const { address, getKeyFromKeplr } = useKeplrAddress(chainInfo);
  
  // Token metadata hook
  const { metadata: tokenMetadata } = useTokenMetadata(denom, chainInfo);
  
  // Helper function to get token info with metadata fallback
  const getTokenInfoWithMetadata = (denom: string, fallbackChainInfo: ChainInfo | null = chainInfo) => {
    // Check if we have a manual decimal override for this denom
    if (manualDecimals[denom] !== undefined) {
      // Get the symbol from metadata or fallback
      let symbol = denom;
      if (tokenMetadata && tokenMetadata.denom === denom) {
        symbol = tokenMetadata.symbol;
      } else {
        const info = getTokenInfo(denom, fallbackChainInfo);
        symbol = info.symbol;
      }
      return {
        symbol,
        decimals: manualDecimals[denom]
      };
    }
    
    // If we have metadata from the hook for the current denom, use it
    if (tokenMetadata && tokenMetadata.denom === denom) {
      return {
        symbol: tokenMetadata.symbol,
        decimals: tokenMetadata.decimals
      };
    }
    // Otherwise fall back to the synchronous method
    return getTokenInfo(denom, fallbackChainInfo);
  };

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.custom-dropdown')) {
        setShowSourceDropdown(false);
        setShowDestDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch chains from Skip API with fault tolerance
  useEffect(() => {
    const fetchChains = async () => {
      try {
        setFetchingChains(true);
        setError('');
        
        // Fetch both mainnet and testnet chains
        const [mainnetsResponse, testnetsResponse] = await Promise.all([
          fetch('https://api.skip.build/v2/info/chains?include_evm=true&include_svm=true&only_testnets=false'),
          fetch('https://api.skip.build/v2/info/chains?include_evm=true&include_svm=true&only_testnets=true')
        ]);
        
        if (!mainnetsResponse.ok || !testnetsResponse.ok) {
          throw new Error('Failed to fetch chains');
        }
        
        const [mainnetsData, testnetsData] = await Promise.all([
          mainnetsResponse.json(),
          testnetsResponse.json()
        ]);
        
        const allChains: SkipChain[] = [
          ...(mainnetsData.chains || []),
          ...(testnetsData.chains || [])
        ];
        
        setChains(allChains);
        
        // Set default source chain
        const osmosisMainnet = allChains.find(chain => chain.chain_id === 'osmosis-1');
        if (osmosisMainnet) {
          setSourceChainId(osmosisMainnet.chain_id);
        }
      } catch (err) {
        setError('Failed to fetch chains. Please refresh the page.');
        console.error('Error fetching chains:', err);
      } finally {
        setFetchingChains(false);
      }
    };

    fetchChains();
  }, []);

  // Auto-suggest channel based on route
  useEffect(() => {
    const suggestChannel = async () => {
      if (!effectiveSourceChainId || !denom) return;
      
      if (activeTab === 'eureka') {
        // For Eureka with Cosmos Hub as source, we need the Eureka channel
        const { EUREKA_CHANNEL } = await import('../util/eureka.constants');
        setChannel(EUREKA_CHANNEL);
      } else if (activeTab === 'ibc') {
        // Clear channel when switching chains - users need to input the correct channel
        setChannel('');
      }
    };

    suggestChannel();
  }, [sourceChainId, effectiveSourceChainId, destinationChainId, activeTab, denom]);

  // Remove automatic fee estimation - now using manual fee input

  // Get cosmos chains for dropdowns, filtered by testnet preference
  const cosmosChains = chains.filter(c => 
    c.chain_type === 'cosmos' && 
    (showTestnets ? c.is_testnet : !c.is_testnet)
  );

  // Validate input
  const validateInput = useCallback(() => {
    if (activeTab === 'ibc' && !sourceChainId) return 'Please select a source chain';
    if (activeTab === 'ibc' && !destinationChainId) return 'Please select a destination chain';
    if (!amount || Number(amount) <= 0) return 'Please enter a valid amount';
    if (!recipient) return 'Please enter a recipient address';
    if (!denom) return 'Please select a token';
    if (!channel) return 'Please enter or wait for channel ID';
    // For Eureka, the channel is "08-wasm-1369", not "channel-X"
    if (activeTab === 'ibc' && !channel.startsWith('channel-')) return 'Channel ID must start with "channel-"';
    
    // Validate recipient address format
    if (activeTab === 'eureka') {
      // Ethereum address validation for Eureka
      if (!recipient.startsWith('0x') || recipient.length !== 42) {
        return 'Please enter a valid Ethereum address (0x...)';
      }
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
        return 'Invalid Ethereum address format';
      }
    } else {
      // Cosmos address validation for IBC
      const destChain = chains.find(c => c.chain_id === destinationChainId);
      if (destChain && destChain.prefix && !recipient.startsWith(destChain.prefix)) {
        return `Recipient address should start with "${destChain.prefix}"`;
      }
    }
    
    return null;
  }, [sourceChainId, destinationChainId, amount, recipient, denom, channel, activeTab, chains]);

  // Handle transaction
  const handleTransaction = async () => {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!window.keplr || !chainInfo) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setStatus('Preparing transaction...');

    try {
      // Get chain info with fallback RPC
      const robustChainInfo = await rpcClient.getChainInfoWithFallback(chainInfo);
      const key = await window.keplr.getKey(robustChainInfo.chainId);
      const feeDenom = robustChainInfo.feeCurrencies?.[0].coinMinimalDenom || denom;
      
      let protoMsg: any;
      
      if (activeTab === 'eureka') {
        // For Eureka, use MsgExecuteContract
        // Get token info - use metadata if available, otherwise fall back to chain info
        const tokenInfo = tokenMetadata || getTokenInfo(denom, robustChainInfo);
        const amountInSmallestUnit = prettyMode 
          ? convertToSmallestUnit(amount, tokenInfo.decimals)
          : amount;
        
        protoMsg = createEurekaExecuteContractMsg({
          sourceChainId: effectiveSourceChainId,
          destinationChainId: destinationChainId,
          sender: key.bech32Address,
          receiver: recipient, // Ethereum address
          amount: amountInSmallestUnit,
          denom,
          memo
        });
      } else {
        // For regular IBC, use MsgTransfer
        const timeoutHeight: Height = { revisionNumber: '0', revisionHeight: '0' };
        const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 43200) * 1000000000; // 12 hours timeout
        
        // Convert amount to smallest unit
        const tokenInfo = tokenMetadata || getTokenInfo(denom, robustChainInfo);
        const amountInSmallestUnit = prettyMode 
          ? convertToSmallestUnit(amount, tokenInfo.decimals)
          : amount;
        
        const token: Coin = { denom, amount: amountInSmallestUnit };
        
        const msg: MsgTransfer = {
          sourcePort: 'transfer',
          sourceChannel: channel,
          token,
          sender: key.bech32Address,
          receiver: recipient,
          timeoutHeight,
          timeoutTimestamp: timeoutTimestamp.toString(),
          memo: memo,
        };
        
        protoMsg = {
          typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
          value: MsgTransfer.encode(msg).finish(),
        };
      }

      // Simulate to estimate gas
      setStatus('Simulating transaction...');
      const gasUsed = await simulateMsgs(
        robustChainInfo,
        key.bech32Address,
        [protoMsg],
        [{ denom: feeDenom, amount: '1000' }]
      );

      if (gasUsed) {
        setStatus('Broadcasting transaction...');
        
        // For route warming, use the same denom as the token being sent
        // Convert manual fee to smallest unit if in pretty mode
        const tokenInfo = getTokenInfoWithMetadata(denom, robustChainInfo);
        const feeInSmallestUnit = prettyMode && manualFee !== '0'
          ? convertToSmallestUnit(manualFee, tokenInfo.decimals)
          : manualFee;
        
        await sendMsgs(
          window.keplr,
          robustChainInfo,
          key.bech32Address,
          [protoMsg],
          {
            amount: [{ denom: denom, amount: feeInSmallestUnit }], // Use same denom as token being sent
            gas: Math.floor(gasUsed * 1.5).toString(),
          },
          (hash: string) => {
            // Add to transactions with steps for Eureka
            const steps = activeTab === 'eureka' ? [
              {
                chain: 'cosmoshub-4',
                status: 'completed' as const,
                description: 'Transaction broadcast to Cosmos Hub',
                timestamp: new Date().toISOString()
              }
            ] : undefined;

            // Store the display amount
            const tokenInfo = getTokenInfoWithMetadata(denom, robustChainInfo);
            const displayAmount = prettyMode ? amount : formatDisplayAmount(amount, tokenInfo.decimals, true);
            
            const newTx: Transaction = {
              hash,
              time: new Date().toISOString(),
              amount: displayAmount,
              denom,
              sourceChain: activeTab === 'eureka' ? 'cosmoshub-4' : sourceChainId,
              destinationChain: activeTab === 'eureka' ? '1' : destinationChainId,
              status: 'success',
              routeType: activeTab as 'ibc' | 'eureka',
              steps
            };
            
            setTransactions(prev => [newTx, ...prev.slice(0, 9)]);
            
            // Clear form
            setAmount('');
            setRecipient('');
            setDenom('');
            setChannel('');
            setMemo('');
            setStatus('Transaction broadcast successfully!');
            
            // For IBC transactions, update status after delay
            if (activeTab === 'ibc') {
              setTimeout(() => {
                setTransactions(prev => 
                  prev.map(tx => 
                    tx.hash === hash 
                      ? { ...tx, status: 'success' }
                      : tx
                  )
                );
              }, 30000); // 30 seconds
            }
          }
        );
      }
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  // Refresh transaction status
  const refreshTransactionStatus = async (txHash: string) => {
    // In a real implementation, this would query the chain for tx status
    console.log('Refreshing status for:', txHash);
  };

  // Tab content
  const ibcContent = (
    <div className="tab-content">
      {/* Form Toggles */}
      <div className="form-toggles">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={prettyMode}
            onChange={(e) => setPrettyMode(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch"></span>
          <span className="toggle-text">
            {prettyMode ? 'Pretty Display' : 'Raw Amounts'}
          </span>
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showTestnets}
            onChange={(e) => {
              setShowTestnets(e.target.checked);
              // Clear selections when toggling
              setSourceChainId('');
              setDestinationChainId('');
              setDenom('');
              setChannel('');
            }}
            className="toggle-input"
          />
          <span className="toggle-switch"></span>
          <span className="toggle-text">
            {showTestnets ? 'Testnet Chains' : 'Mainnet Chains'}
          </span>
        </label>
      </div>

      <div className="form-section">
        {/* Source Chain */}
        <div className="form-group">
          <label>Source Chain</label>
          <div className="custom-dropdown">
            <div 
              className="dropdown-trigger"
              onClick={() => {
                setShowSourceDropdown(!showSourceDropdown);
              }}
            >
              {sourceChainId ? 
                chains.find(c => c.chain_id === sourceChainId)?.chain_name || sourceChainId 
                : 'Select source chain'
              }
              <span className="arrow">▼</span>
            </div>
            {showSourceDropdown && (
              <div className="dropdown-menu">
                <input
                  type="text"
                  className="dropdown-search"
                  placeholder="Search chains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="dropdown-options">
                  {cosmosChains
                    .filter(chain => 
                      !searchTerm || 
                      chain.chain_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      chain.chain_id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => a.chain_name.localeCompare(b.chain_name))
                    .map(chain => (
                      <div
                        key={chain.chain_id}
                        className={`dropdown-option ${sourceChainId === chain.chain_id ? 'selected' : ''}`}
                        onClick={() => {
                          setSourceChainId(chain.chain_id);
                          setShowSourceDropdown(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="chain-name">{chain.chain_name}</span>
                        <span className="chain-id">{chain.chain_id}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Destination Chain */}
        <div className="form-group">
          <label>Destination Chain</label>
          <div className="custom-dropdown">
            <div 
              className="dropdown-trigger"
              onClick={() => {
                setShowDestDropdown(!showDestDropdown);
              }}
            >
              {destinationChainId ? 
                chains.find(c => c.chain_id === destinationChainId)?.chain_name || destinationChainId 
                : 'Select destination chain'
              }
              <span className="arrow">▼</span>
            </div>
            {showDestDropdown && (
              <div className="dropdown-menu">
                <input
                  type="text"
                  className="dropdown-search"
                  placeholder="Search chains..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="dropdown-options">
                  {cosmosChains
                    .filter(chain => chain.chain_id !== sourceChainId)
                    .filter(chain => 
                      !searchTerm || 
                      chain.chain_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      chain.chain_id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .sort((a, b) => a.chain_name.localeCompare(b.chain_name))
                    .map(chain => (
                      <div
                        key={chain.chain_id}
                        className={`dropdown-option ${destinationChainId === chain.chain_id ? 'selected' : ''}`}
                        onClick={() => {
                          setDestinationChainId(chain.chain_id);
                          setShowDestDropdown(false);
                          setSearchTerm('');
                        }}
                      >
                        <span className="chain-name">{chain.chain_name}</span>
                        <span className="chain-id">{chain.chain_id}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Token Selection */}
        {address && chainInfo && (
          <BalanceDropdown
            chainInfo={chainInfo}
            address={address}
            selectedDenom={denom}
            onDenomSelect={setDenom}
            prettyMode={prettyMode}
            manualDecimals={manualDecimals}
          />
        )}

        {/* Recipient */}
        <div className="form-group">
          <label>Recipient Address</label>
          <input
            type="text"
            className="form-input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={`${chains.find(c => c.chain_id === destinationChainId)?.prefix || 'cosmos'}...`}
          />
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>
            Amount 
            {denom && (
              <span className="amount-hint">
                {(() => {
                  const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                  if (prettyMode) {
                    return `(in ${tokenInfo.symbol}, using ${tokenInfo.decimals} decimals)`;
                  } else {
                    return `(in ${tokenInfo.symbol} smallest unit)`;
                  }
                })()}
                {prettyMode && (
                  <button
                    className="decimal-settings-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDecimalSettings(true);
                      setDecimalInput(manualDecimals[denom]?.toString() || getTokenInfoWithMetadata(denom, chainInfo).decimals.toString());
                    }}
                    title="Adjust decimals"
                  >
                    ⚙️
                  </button>
                )}
              </span>
            )}
          </label>
          <input
            type="text"
            className="form-input"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder={prettyMode ? "0.0 (e.g., 1.5)" : "0"}
          />
          {amount && denom && (
            <div className="amount-conversion">
              {(() => {
                const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                if (prettyMode) {
                  const rawAmount = convertToSmallestUnit(amount, tokenInfo.decimals);
                  return `= ${rawAmount} ${tokenInfo.symbol} (raw)`;
                } else {
                  const prettyAmount = formatDisplayAmount(amount, tokenInfo.decimals, true);
                  return `= ${prettyAmount} ${tokenInfo.symbol}`;
                }
              })()}
            </div>
          )}
        </div>

        {/* Channel */}
        <div className="form-group">
          <label>IBC Channel (from source chain)</label>
          <input
            type="text"
            className="form-input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="e.g., channel-0, channel-141"
          />
          <p className="form-hint">
            Enter the IBC channel ID from {chains.find(c => c.chain_id === sourceChainId)?.chain_name || 'source'} to {chains.find(c => c.chain_id === destinationChainId)?.chain_name || 'destination'}.
            You can find channel IDs on explorers like Mintscan or by querying the chain.
          </p>
        </div>

        {/* Manual Fee Input */}
        <div className="form-group">
          <label>
            Fee Amount (Route Warming)
            {denom && chainInfo && (
              <span className="amount-hint">
                {(() => {
                  const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                  if (prettyMode) {
                    return `(in ${tokenInfo.symbol}, using ${tokenInfo.decimals} decimals)`;
                  } else {
                    return `(in ${tokenInfo.symbol} smallest unit)`;
                  }
                })()}
              </span>
            )}
          </label>
          <input
            type="text"
            className="form-input"
            value={manualFee}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setManualFee(val);
              }
            }}
            placeholder="0"
          />
          <p className="form-hint">Set to 0 for route warming. Fee uses same token as transfer.</p>
          {manualFee && manualFee !== '0' && denom && chainInfo && (
            <div className="amount-conversion">
              {(() => {
                const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                if (prettyMode) {
                  const rawFee = convertToSmallestUnit(manualFee, tokenInfo.decimals);
                  return `= ${rawFee} ${tokenInfo.symbol} (raw)`;
                } else {
                  const prettyFee = formatDisplayAmount(manualFee, tokenInfo.decimals, true);
                  return `= ${prettyFee} ${tokenInfo.symbol}`;
                }
              })()}
            </div>
          )}
        </div>

        {/* Route Visualizer */}
        {sourceChainId && destinationChainId && (
          <RouteVisualizer
            sourceChain={{
              chainId: sourceChainId,
              chainName: chains.find(c => c.chain_id === sourceChainId)?.chain_name || sourceChainId
            }}
            destinationChain={{
              chainId: destinationChainId,
              chainName: chains.find(c => c.chain_id === destinationChainId)?.chain_name || destinationChainId
            }}
            routeType="ibc"
          />
        )}
      </div>
    </div>
  );

  const eurekaContent = (
    <div className="tab-content">
      {/* Form Toggle */}
      <div className="form-toggles">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={prettyMode}
            onChange={(e) => setPrettyMode(e.target.checked)}
            className="toggle-input"
          />
          <span className="toggle-switch"></span>
          <span className="toggle-text">
            {prettyMode ? 'Pretty Display' : 'Raw Amounts'}
          </span>
        </label>
      </div>

      <div className="eureka-info">
        <div className="info-banner">
          <span className="info-icon">🌉</span>
          <div>
            <h4>Eureka Protocol - Direct Cosmos Hub to Ethereum Route</h4>
            <p>Send tokens from Cosmos Hub directly to Ethereum</p>
            <p className="contract-info">Contract: {EUREKA_CONTRACT_ADDRESS.slice(0, 20)}...</p>
          </div>
        </div>
      </div>

      <div className="form-section">
        {/* Fixed Route Display */}
        <div className="form-group">
          <label>Route</label>
          <div className="fixed-route">
            <div className="route-display">
              <span className="chain-badge">Cosmos Hub</span>
              <span className="route-arrow">→</span>
              <span className="chain-badge">Ethereum</span>
            </div>
          </div>
          <p className="form-hint">Direct transfer from Cosmos Hub to Ethereum via Eureka protocol</p>
        </div>

        {/* Token Selection */}
        {address && chainInfo && (
          <BalanceDropdown
            chainInfo={chainInfo}
            address={address}
            selectedDenom={denom}
            onDenomSelect={setDenom}
            prettyMode={prettyMode}
            manualDecimals={manualDecimals}
          />
        )}

        {/* Recipient */}
        <div className="form-group">
          <label>Ethereum Address</label>
          <input
            type="text"
            className="form-input"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
          />
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>
            Amount 
            {denom && (
              <span className="amount-hint">
                {(() => {
                  const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                  if (prettyMode) {
                    return `(in ${tokenInfo.symbol}, using ${tokenInfo.decimals} decimals)`;
                  } else {
                    return `(in ${tokenInfo.symbol} smallest unit)`;
                  }
                })()}
                {prettyMode && (
                  <button
                    className="decimal-settings-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowDecimalSettings(true);
                      setDecimalInput(manualDecimals[denom]?.toString() || getTokenInfoWithMetadata(denom, chainInfo).decimals.toString());
                    }}
                    title="Adjust decimals"
                  >
                    ⚙️
                  </button>
                )}
              </span>
            )}
          </label>
          <input
            type="text"
            className="form-input"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder={prettyMode ? "0.0 (e.g., 1.5)" : "0"}
          />
          {amount && denom && (
            <div className="amount-conversion">
              {(() => {
                const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                if (prettyMode) {
                  const rawAmount = convertToSmallestUnit(amount, tokenInfo.decimals);
                  return `= ${rawAmount} ${tokenInfo.symbol} (raw)`;
                } else {
                  const prettyAmount = formatDisplayAmount(amount, tokenInfo.decimals, true);
                  return `= ${prettyAmount} ${tokenInfo.symbol}`;
                }
              })()}
            </div>
          )}
        </div>

        {/* Channel (Auto-populated) */}
        <div className="form-group">
          <label>Channel ID (Auto-detected)</label>
          <input
            type="text"
            className="form-input"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Detecting best channel..."
            disabled={!channel}
          />
        </div>

        {/* Manual Fee Input for Eureka */}
        <div className="form-group">
          <label>
            Fee Amount (Route Warming)
            {denom && chainInfo && (
              <span className="amount-hint">
                {(() => {
                  const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                  if (prettyMode) {
                    return `(in ${tokenInfo.symbol}, using ${tokenInfo.decimals} decimals)`;
                  } else {
                    return `(in ${tokenInfo.symbol} smallest unit)`;
                  }
                })()}
              </span>
            )}
          </label>
          <input
            type="text"
            className="form-input"
            value={manualFee}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setManualFee(val);
              }
            }}
            placeholder="0"
          />
          <p className="form-hint">Set to 0 for route warming. Fee uses same token as transfer.</p>
          {manualFee && manualFee !== '0' && denom && chainInfo && (
            <div className="amount-conversion">
              {(() => {
                const tokenInfo = getTokenInfoWithMetadata(denom, chainInfo);
                if (prettyMode) {
                  const rawFee = convertToSmallestUnit(manualFee, tokenInfo.decimals);
                  return `= ${rawFee} ${tokenInfo.symbol} (raw)`;
                } else {
                  const prettyFee = formatDisplayAmount(manualFee, tokenInfo.decimals, true);
                  return `= ${prettyFee} ${tokenInfo.symbol}`;
                }
              })()}
            </div>
          )}
        </div>

        {/* Route Visualizer */}
        <RouteVisualizer
          sourceChain={{
            chainId: 'cosmoshub-4',
            chainName: 'Cosmos Hub'
          }}
          destinationChain={{
            chainId: '1',
            chainName: 'Ethereum'
          }}
          routeType="eureka"
        />
      </div>
    </div>
  );

  const tabs = [
    {
      id: 'ibc',
      label: 'IBC Route Warming',
      content: ibcContent
    },
    {
      id: 'eureka',
      label: 'Eureka Route Warming',
      content: eurekaContent
    }
  ];

  return (
    <div className="route-warmer">
      {/* Decimal Settings Modal */}
      {showDecimalSettings && denom && (
        <div className="modal-overlay" onClick={() => setShowDecimalSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Decimal Settings</h3>
            <p className="modal-description">
              Adjust the decimal places for {getTokenInfoWithMetadata(denom, chainInfo).symbol}
            </p>
            <div className="modal-form">
              <label>Decimal Places:</label>
              <input
                type="number"
                className="decimal-input"
                value={decimalInput}
                onChange={(e) => setDecimalInput(e.target.value)}
                min="0"
                max="18"
                placeholder="Enter decimal places"
              />
              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowDecimalSettings(false);
                    setDecimalInput('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const decimals = parseInt(decimalInput);
                    if (!isNaN(decimals) && decimals >= 0 && decimals <= 18) {
                      setManualDecimals(prev => ({
                        ...prev,
                        [denom]: decimals
                      }));
                      setShowDecimalSettings(false);
                      setDecimalInput('');
                    }
                  }}
                >
                  Save
                </button>
              </div>
              {manualDecimals[denom] !== undefined && (
                <button
                  className="btn btn-link reset-btn"
                  onClick={() => {
                    setManualDecimals(prev => {
                      const newDecimals = { ...prev };
                      delete newDecimals[denom];
                      return newDecimals;
                    });
                    setShowDecimalSettings(false);
                    setDecimalInput('');
                  }}
                >
                  Reset to default
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="container">
        <header className="header">
          <div className="header-content">
            <div>
              <h1>IBC Route Warmer</h1>
              <p>Warm up IBC routes across chains</p>
            </div>
            <div className="header-controls">
              {!address ? (
                <button 
                  className="btn btn-primary connect-wallet-btn"
                  onClick={getKeyFromKeplr}
                >
                  Connect Keplr
                </button>
              ) : (
                <div className="connected-address">
                  <span className="wallet-icon">🔗</span>
                  <span className="address-text">{address.slice(0, 10)}...{address.slice(-8)}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {fetchingChains ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading chains...</p>
          </div>
        ) : (
          <div className="main-content">
            {address ? (
              <>
                {/* Tab Navigation */}
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={(newTab) => {
                    setActiveTab(newTab);
                    // Clear form when switching tabs
                    setDenom('');
                    setAmount('');
                    setRecipient('');
                    setChannel('');
                    setDestinationChainId('');
                    setMemo('');
                    setManualFee('0');
                    setError('');
                    setStatus('');
                  }}
                />

                {/* Status Messages */}
                {error && (
                  <div className="alert alert-error">
                    <span className="alert-icon">⚠️</span>
                    {error}
                  </div>
                )}
                {status && !error && (
                  <div className="alert alert-success">
                    <span className="alert-icon">✓</span>
                    {status}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  className="btn btn-primary btn-large"
                  onClick={handleTransaction}
                  disabled={loading || !address}
                >
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Processing...
                    </>
                  ) : (
                    `🔥 Warm ${activeTab === 'eureka' ? 'Eureka' : 'IBC'} Route 🔥`
                  )}
                </button>

                {/* Transaction Tracker */}
                <TransactionTracker
                  transactions={transactions}
                  chains={chains}
                  onRefresh={refreshTransactionStatus}
                />
              </>
            ) : (
              <div className="wallet-prompt">
                <div className="prompt-icon">🔐</div>
                <h3>Connect Your Wallet</h3>
                <p>Please connect your Keplr wallet to start warming routes</p>
                <button 
                  className="btn btn-primary btn-large"
                  onClick={getKeyFromKeplr}
                >
                  Connect Keplr Wallet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteWarmer;