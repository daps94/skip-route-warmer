import React from 'react';
import './RouteVisualizer.css';

interface RouteVisualizerProps {
  sourceChain: {
    chainId: string;
    chainName: string;
  };
  destinationChain?: {
    chainId: string;
    chainName: string;
  };
  routeType: 'ibc' | 'eureka';
  intermediateChains?: Array<{
    chainId: string;
    chainName: string;
  }>;
}

const RouteVisualizer: React.FC<RouteVisualizerProps> = ({
  sourceChain,
  destinationChain,
  routeType,
  intermediateChains = [],
}) => {
  const getChainIcon = (chainId: string): string => {
    // Return appropriate emoji/icon based on chain
    const chainIcons: Record<string, string> = {
      'osmosis-1': '🌊',
      'cosmoshub-4': '⚛️',
      '1': '💎', // Ethereum
      'neutron-1': '🔷',
      'stride-1': '🏃',
      'axelar-dojo-1': '🔗',
      'injective-1': '💉',
    };
    return chainIcons[chainId] || '🔘';
  };

  const renderRoute = () => {
    if (routeType === 'ibc' && !destinationChain) {
      // Simple IBC route (same chain)
      return (
        <div className="route-simple">
          <div className="route-node">
            <span className="chain-icon">{getChainIcon(sourceChain.chainId)}</span>
            <span className="chain-name">{sourceChain.chainName}</span>
          </div>
          <div className="route-arrow">→</div>
          <div className="route-node">
            <span className="chain-icon">{getChainIcon(sourceChain.chainId)}</span>
            <span className="chain-name">{sourceChain.chainName}</span>
          </div>
        </div>
      );
    }

    // Complex route with intermediate chains
    const allChains = [
      sourceChain,
      ...intermediateChains,
      ...(destinationChain ? [destinationChain] : [])
    ];

    return (
      <div className="route-complex">
        {allChains.map((chain, index) => (
          <React.Fragment key={`${chain.chainId}-${index}`}>
            <div className="route-node">
              <span className="chain-icon">{getChainIcon(chain.chainId)}</span>
              <span className="chain-name">{chain.chainName}</span>
              {index === 0 && <span className="node-label">Source</span>}
              {index === allChains.length - 1 && index > 0 && (
                <span className="node-label">Destination</span>
              )}
            </div>
            {index < allChains.length - 1 && (
              <div className="route-connector">
                <div className="route-line"></div>
                <div className="route-arrow">→</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="route-visualizer">
      <div className="route-header">
        <h4>Route Path</h4>
        <span className={`route-type ${routeType}`}>
          {routeType === 'eureka' ? 'Eureka Protocol' : 'IBC Transfer'}
        </span>
      </div>

      <div className="route-container">{renderRoute()}</div>
    </div>
  );
};

export default RouteVisualizer;