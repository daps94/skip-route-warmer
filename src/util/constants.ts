// Use CORS-enabled endpoints
export const API_OVERRIDE: { [key: string]: {
    rest: string;
    rpc: string;
  } } = {
    "neutron-1": {
      rest: "https://rest-kralum.neutron-1.neutron.org",
      rpc: "https://rpc-kralum.neutron-1.neutron.org"
    },
    "cosmoshub-4": {
      rest: "https://cosmos-rest.publicnode.com",
      rpc: "https://cosmos-rpc.publicnode.com:443"
    },
    "osmosis-1": {
      rest: "https://osmosis-rest.publicnode.com",
      rpc: "https://osmosis-rpc.publicnode.com:443"
    },
    "axelar-dojo-1": {
      rest: "https://axelar-rest.publicnode.com",
      rpc: "https://axelar-rpc.publicnode.com:443"
    },
    "stride-1": {
      rest: "https://stride-rest.publicnode.com",
      rpc: "https://stride-rpc.publicnode.com:443"
    },
    "juno-1": {
      rest: "https://juno-rest.publicnode.com",
      rpc: "https://juno-rpc.publicnode.com:443"
    },
    "stargaze-1": {
      rest: "https://stargaze-rest.publicnode.com",
      rpc: "https://stargaze-rpc.publicnode.com:443"
    },
    "kaiyo-1": {
      rest: "https://kujira-rest.publicnode.com",
      rpc: "https://kujira-rpc.publicnode.com:443"
    },
    "akashnet-2": {
      rest: "https://akash-rest.publicnode.com",
      rpc: "https://akash-rpc.publicnode.com:443"
    },
    "secret-4": {
      rest: "https://secret-rest.publicnode.com",
      rpc: "https://secret-rpc.publicnode.com:443"
    },
    "celestia": {
      rest: "https://celestia-rest.publicnode.com",
      rpc: "https://celestia-rpc.publicnode.com:443"
    },
    "dydx-mainnet-1": {
      rest: "https://dydx-rest.publicnode.com",
      rpc: "https://dydx-rpc.publicnode.com:443"
    }
  }
export const SKIP_BASE_API = 'https://api.skip.build/v2';
