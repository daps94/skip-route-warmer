export const API_OVERRIDE: { [key: string]: {
    rest: string;
    rpc: string;
  } } = {
    "neutron-1": {
      rest: "https://lcd-neutron.whispernode.com",
      rpc: "https://rpc-neutron.whispernode.com"
    },
  }
export const SKIP_BASE_API = 'https://api.skip.build/v2';
