The Skip Route Warmer interface helps developers "warm" a specific IBC route for a newly launched token. This ensures that the Skip Go API can recommend the right channel to users that want to transfer that token. 

See Live Deployment: [Route Warmer](https://enchanting-pothos-10882b.netlify.app)

## Getting Started

Requirements:
- Keplr Wallet
- A destination chain with an IBC channel

### Step 1: Select the Source Chain
Select the source chain for your token from the dropdown menu. This is the chain where your token was initially launched. The interface provides a list of all available CosmosSDK-based mainnet chains in the [Cosmos chain-registry](https://github.com/cosmos/chain-registry).

### Step 2: Select the Token Denomination
Once a source chain is selected, the interface will detect the token denominations available in your wallet on that chain. Select your newly launched token from this dropdown.

### Step 3: Enter the Recipient Address
Provide the recipient address on the destination chain where you want the token to be transferred. This can be your own address or the address of another user or contract on the destination chain.

### Step 4: Select the Source Channel
The interface will automatically suggest a channel based on available liquidity data. If a recommendation is provided, it will be pre-filled for you. If no recommendation is available, or if you prefer to use a different channel, you can manually enter the channel ID.

### Step 5: Submit the Transfer
Submit your transfer request by clicking the “🔥 Warm ️‍🔥” button. This will initiate the IBC transfer and warm the route for your token by transfering 1 unit of the token. You can preview the transaction details in Keplr to confirm your selections.

Skip's liquidity detection algorithm will recognize this transfer and use the selected channel as the reccomended route for future transfers of this token. 

### Why It's Important
IBC routes are identified by channels, and the channel selected during the transfer directly impacts the token’s denomination on the destination chain. If the wrong channel is chosen, the resulting token may not match the denomination expected by liquidity pools or other contracts on the destination chain. Warming the route allows the Skip API to automatically detect and recommend the best channel for future transfers, ensuring that users receive the correct token in their wallet.
 
## Local Development

Install dependencies

```bash
yarn install
```

Run development Server
```bash
yarn start
```

### Further Development
- Better infra. App currently has a number of CORS, 429, & other infra-related issues. Osmosis is the only chain that works without issue. Also some chains do not support the simulate endpoint.
- Better transaction tracing. Websocket connection via rpc in `TendermintTxTracer` somtimes fails, depriving user of succesful tx hash.
- Reduce calls to Skip API. Currently calls api for source channel reccomendations on field change.
- Validate form fields. Currently only checks if fields are empty. Including somethign like `react-hook-form` or `formik` would be better. Handle edge cases like invalid addresses, no balances on chain etc. 
- Integrate more wallets. Currently only supports Keplr. Could use a library like Cosmology. 
- Allow for multiple fee denoms. E.g. using IBC'd ATOM on Noble. 
- Make it attractive. Currently looks like a 90s website.