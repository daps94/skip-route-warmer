import React, { useState } from 'react';
import './TransactionTracker.css';

export interface Transaction {
  hash: string;
  time: string;
  amount: string;
  denom: string;
  sourceChain: string;
  destinationChain: string;
  status: 'pending' | 'success' | 'failed';
  routeType: 'ibc' | 'eureka';
  steps?: TransactionStep[];
}

interface TransactionStep {
  chain: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  timestamp?: string;
}

interface TransactionTrackerProps {
  transactions: Transaction[];
  chains: Array<{ chain_id: string; chain_name: string }>;
  onRefresh?: (txHash: string) => void;
}

const TransactionTracker: React.FC<TransactionTrackerProps> = ({
  transactions,
  chains,
  onRefresh,
}) => {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const getChainName = (chainId: string): string => {
    return chains.find(c => c.chain_id === chainId)?.chain_name || chainId;
  };

  const getStatusIcon = (status: Transaction['status']): string => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: Transaction['status']): string => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  const getExplorerUrl = (chainId: string, txHash: string, routeType?: 'ibc' | 'eureka'): string => {
    // Use Skip Explorer for all transactions to track cross-chain transfers
    return `https://explorer.skip.build/?tx_hash=${txHash}&chain_id=${chainId}`;
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const truncateHash = (hash: string): string => {
    if (!hash) return '';
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  if (transactions.length === 0) {
    return (
      <div className="transaction-tracker">
        <h3>Recent Transactions</h3>
        <div className="no-transactions">
          <span className="empty-icon">📭</span>
          <p>No transactions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-tracker">
      <h3>Recent Transactions</h3>
      <div className="transactions-list">
        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className={`transaction-item ${getStatusColor(tx.status)}`}
          >
            <div
              className="tx-header"
              onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
            >
              <div className="tx-main-info">
                <span className="tx-status-icon">{getStatusIcon(tx.status)}</span>
                <div className="tx-details">
                  <div className="tx-route">
                    <span className="tx-chain">{getChainName(tx.sourceChain)}</span>
                    {tx.destinationChain !== tx.sourceChain && (
                      <>
                        <span className="tx-arrow">→</span>
                        <span className="tx-chain">{getChainName(tx.destinationChain)}</span>
                      </>
                    )}
                    <span className={`tx-type ${tx.routeType}`}>
                      {tx.routeType === 'eureka' ? 'Eureka' : 'IBC'}
                    </span>
                  </div>
                  <div className="tx-amount">
                    {tx.amount} {tx.denom}
                  </div>
                </div>
              </div>
              <div className="tx-meta">
                <span className="tx-time">{formatTime(tx.time)}</span>
                <span className="tx-expand-icon">
                  {expandedTx === tx.hash ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {expandedTx === tx.hash && (
              <div className="tx-expanded">
                <div className="tx-hash-section">
                  <span className="label">Transaction Hash:</span>
                  <code className="tx-hash">{truncateHash(tx.hash)}</code>
                  <button
                    className="copy-button"
                    onClick={() => navigator.clipboard.writeText(tx.hash)}
                    title="Copy full hash"
                  >
                    📋
                  </button>
                </div>

                {tx.steps && tx.steps.length > 0 && (
                  <div className="tx-steps">
                    <span className="label">Progress:</span>
                    <div className="steps-list">
                      {tx.steps.map((step, index) => (
                        <div key={index} className={`step-item ${step.status}`}>
                          <span className="step-icon">
                            {step.status === 'completed' ? '✅' : 
                             step.status === 'failed' ? '❌' : '⏳'}
                          </span>
                          <span className="step-description">{step.description}</span>
                          {step.timestamp && (
                            <span className="step-time">{formatTime(step.timestamp)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="tx-actions">
                  <a
                    href={getExplorerUrl(tx.sourceChain, tx.hash, tx.routeType)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tx-link"
                  >
                    View on Skip Explorer →
                  </a>
                  {tx.routeType === 'eureka' && (
                    <p className="explorer-hint">Track cross-chain progress on Skip Explorer</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionTracker;