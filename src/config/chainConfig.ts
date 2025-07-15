// Extended chain configuration to support custom RPCs and configurations
export interface ChainConfig {
  chainId: string;
  chainName: string;
  rpc: string;
  rest: string;
  prefix: string;
  denom: string;
  minimalDenom: string;
  decimals: number;
  gasPrice: string;
  gasMultiplier: number;
  eurekaContract?: string;
  eurekaChannel?: string;
  supportedRoutes: RouteType[];
}

export type RouteType = "standard-ibc" | "eureka-cosmos" | "eureka-ethereum";

// Default chain configurations with support for custom RPCs
export const defaultChainConfigs: Record<string, ChainConfig> = {
  "osmosis-1": {
    chainId: "osmosis-1",
    chainName: "Osmosis",
    rpc: "https://rpc.osmosis.zone",
    rest: "https://lcd.osmosis.zone",
    prefix: "osmo",
    denom: "OSMO",
    minimalDenom: "uosmo",
    decimals: 6,
    gasPrice: "0.025",
    gasMultiplier: 1.5,
    eurekaContract: "osmo1eureka_contract_here",
    eurekaChannel: "channel-eureka",
    supportedRoutes: ["standard-ibc", "eureka-cosmos", "eureka-ethereum"]
  },
  "cosmoshub-4": {
    chainId: "cosmoshub-4",
    chainName: "Cosmos Hub",
    rpc: "https://cosmos-rpc.polkachu.com",
    rest: "https://cosmos-api.polkachu.com",
    prefix: "cosmos",
    denom: "ATOM",
    minimalDenom: "uatom",
    decimals: 6,
    gasPrice: "0.025",
    gasMultiplier: 1.5,
    eurekaContract: "cosmos1eureka_contract_here",
    eurekaChannel: "channel-eureka",
    supportedRoutes: ["standard-ibc", "eureka-cosmos", "eureka-ethereum"]
  },
  "seda-1": {
    chainId: "seda-1",
    chainName: "SEDA",
    rpc: "https://rpc.seda.xyz",
    rest: "https://lcd.seda.xyz",
    prefix: "seda",
    denom: "SEDA",
    minimalDenom: "aseda",
    decimals: 18,
    gasPrice: "10000000000",
    gasMultiplier: 1.5,
    supportedRoutes: ["standard-ibc", "eureka-cosmos"]
  },
  "axelar-dojo-1": {
    chainId: "axelar-dojo-1",
    chainName: "Axelar",
    rpc: "https://axelar-rpc.polkachu.com",
    rest: "https://axelar-api.polkachu.com",
    prefix: "axelar",
    denom: "AXL",
    minimalDenom: "uaxl",
    decimals: 6,
    gasPrice: "0.007",
    gasMultiplier: 1.5,
    supportedRoutes: ["standard-ibc"]
  }
};

// Eureka contract addresses for different chains
export const EUREKA_CONTRACTS: Record<string, string> = {
  "cosmoshub-4": "cosmos1clswlqlfm8gpn7n5wu0ypu0ugaj36urlhj7yz30hn7v7mkcm2tuqy9f8s5",
  "osmosis-1": "osmo1eureka_contract_address",
  // Add more as needed
};

// Ethereum destination addresses for Eureka routes
export const ETHEREUM_DESTINATIONS = {
  mainnet: "0x0000000000000000000000000000000000000001",
  arbitrum: "0x0000000000000000000000000000000000000001",
  optimism: "0x0000000000000000000000000000000000000001",
  base: "0x0000000000000000000000000000000000000001",
};

// Validation rules for different route types
export const ROUTE_VALIDATION = {
  minAmount: {
    "standard-ibc": "1",
    "eureka-cosmos": "1000000",
    "eureka-ethereum": "10000000"
  },
  maxMemoLength: 256,
  channelPattern: /^channel-\d+$/,
  addressPatterns: {
    cosmos: /^[a-z]+1[a-z0-9]{38,}$/,
    ethereum: /^0x[a-fA-F0-9]{40}$/
  }
};