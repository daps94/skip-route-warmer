// Eureka Protocol Constants
export const EUREKA_CHANNEL = "08-wasm-1369"; // Channel ID for Eureka on Cosmos Hub
export const EUREKA_CONTRACT_ADDRESS = "cosmos1clswlqlfm8gpn7n5wu0ypu0ugaj36urlhj7yz30hn7v7mkcm2tuqy9f8s5";
export const EUREKA_PORT = "wasm.cosmoshub-4." + EUREKA_CONTRACT_ADDRESS;

// Minimum amounts for Eureka routes (in smallest unit)
export const EUREKA_MIN_AMOUNTS: Record<string, string> = {
  "uatom": "1000000", // 1 ATOM
  "uosmo": "1000000", // 1 OSMO
  "untrn": "1000000", // 1 NTRN
  "ustrd": "1000000", // 1 STRD
};

// Supported Eureka routes
export const EUREKA_SUPPORTED_ROUTES = [
  { source: "cosmoshub-4", destination: "1" }, // Cosmos Hub to Ethereum
  { source: "osmosis-1", destination: "1" },   // Osmosis to Ethereum via Hub
  { source: "neutron-1", destination: "1" },   // Neutron to Ethereum via Hub
  { source: "stride-1", destination: "1" },    // Stride to Ethereum via Hub
];