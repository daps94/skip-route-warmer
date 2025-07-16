# IBC Route Warmer

A comprehensive web application for warming IBC routes across Cosmos chains and Eureka Protocol routes from Cosmos Hub to Ethereum. This tool helps ensure newly launched tokens can be properly routed through IBC channels by performing initial transfers that establish the route.

See Live Deployment: [Route Warmer](https://enchanting-pothos-10882b.netlify.app)

## Features

### 🌐 IBC Route Warming
- Support for **all Cosmos chains** (mainnet and testnet) via Skip API
- Dynamic balance fetching with automatic token metadata detection
- Manual decimal configuration for precise amount handling
- Real-time chain search and filtering
- Custom denom support with balance querying
- Memo field support for additional transfer information

### 🌉 Eureka Protocol Support
- Direct Cosmos Hub to Ethereum transfers
- Fixed route configuration for simplified UX
- Proper message encoding for cross-chain compatibility
- 12-hour timeout windows for reliable transfers

### 💰 Advanced Token Management
- **Pretty Display Mode**: Toggle between human-readable amounts and raw token units
- **Manual Decimal Override**: Set custom decimal places for any token
- **Dynamic Balance Loading**: Automatically fetches all non-zero balances
- **Custom Denom Query**: Query balances for any IBC or factory denom

### 🎯 Enhanced User Experience
- Persistent wallet connection across tabs
- Transaction tracking with Skip Explorer integration
- Responsive design for mobile and desktop
- Dark mode interface
- Real-time form validation
- Network toggle (mainnet/testnet) for IBC routes

## Getting Started

Requirements:
- Keplr Wallet
- Tokens on a supported Cosmos chain

### IBC Route Warming

1. **Connect Wallet**: Click "Connect Keplr" in the header
2. **Select Network Type**: Choose between Mainnet or Testnet chains
3. **Select Chains**: Choose source and destination chains from the full Skip-supported list
4. **Select Token**: Pick from your available balances or query a custom denom
5. **Enter Details**:
   - Recipient address (with correct prefix validation)
   - Transfer amount (supports pretty display or raw amounts)
   - IBC channel ID (find on explorers like Mintscan)
   - Optional memo
6. **Set Fee**: For route warming, typically set to 0
7. **Submit**: Click "🔥 Warm IBC Route 🔥"

### Eureka Route Warming

1. **Connect Wallet**: Must have tokens on Cosmos Hub
2. **Select Token**: Choose from your Cosmos Hub balances
3. **Enter Ethereum Address**: Provide destination 0x address
4. **Set Amount**: Enter transfer amount
5. **Submit**: Click "🔥 Warm Eureka Route 🔥"

### Why Route Warming Matters

When launching new tokens or establishing new IBC paths:
- Initial transfers "warm" the route, making it discoverable
- Prevents liquidity fragmentation across multiple channels
- Ensures consistent token denominations on destination chains
- Helps DEXs and aggregators recognize the correct routing path

## Local Development

Install dependencies

```bash
yarn install
```

Run development Server
```bash
yarn start
```

## Technical Improvements Made

### Infrastructure & Reliability
- ✅ Fixed CORS issues with robust RPC/REST endpoint fallback system
- ✅ Implemented proper error handling and retry logic
- ✅ Added support for all Skip API chains (not just Osmosis/Neutron)
- ✅ Separated RPC and REST endpoint handling

### Performance & API Usage
- ✅ Removed unnecessary Skip API calls for channel recommendations
- ✅ Implemented efficient batch fetching for chains (mainnet + testnet)
- ✅ Added token metadata caching to reduce repeated queries

### Form Validation & UX
- ✅ Enhanced validation with proper error messages
- ✅ Address prefix validation based on destination chain
- ✅ Ethereum address format validation for Eureka
- ✅ Amount validation with decimal support
- ✅ Channel ID format validation

### Token & Fee Handling
- ✅ Support for any fee denom (not limited to native tokens)
- ✅ Manual fee input for route warming (typically 0)
- ✅ Proper decimal handling for all tokens
- ✅ Custom denom balance querying

### Design & Interface
- ✅ Modern dark theme UI with smooth animations
- ✅ Responsive design for all screen sizes
- ✅ Clean component architecture
- ✅ Intuitive tab-based interface
- ✅ Professional styling with CSS variables

## Architecture

```
src/
├── components/
│   ├── RouteWarmer.tsx       # Main component with tab logic
│   ├── Tabs.tsx              # Reusable tab navigation
│   ├── BalanceDropdown.tsx   # Token selection with balances
│   ├── RouteVisualizer.tsx   # Visual route representation
│   └── TransactionTracker.tsx # Transaction history & status
├── util/
│   ├── eurekaProtocolV2.ts   # Eureka message construction
│   ├── rpcClient.ts          # Robust chain connection handling
│   ├── tokenMetadata.ts      # Token decimal/symbol resolution
│   ├── formatters.ts         # Amount formatting utilities
│   └── sendMsgs.ts           # Transaction broadcasting
└── hooks/
    └── useTokenMetadata.ts   # React hook for token data
```

## Contributing

Contributions are welcome! Some areas for future enhancement:

- Multi-wallet support (Leap, Station, etc.)
- IBC channel auto-discovery
- Route warming automation for multiple tokens
- Historical route analytics
- Integration with more cross-chain protocols