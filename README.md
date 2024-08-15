The Skip Route Warmer allows developers to send newly launched tokens over a specific IBC route. This initial transfer *warms* the route, enabling the Skip Go API to recommend the correct route for subsequent transfers of that token. This helps avoid user confusion and liquidity issues.


<img src="/public/ui.png" alt="Route Warmer" width="500" height="400">

See Live Deployment: [Route Warmer](https://enchanting-pothos-10882b.netlify.app)

## Getting Started

Requirements:
- Keplr Wallet
- A destination chain with an IBC channel

### Step 1: Select Source Chain
Select the token's source chain from the dropdown. This is the native chain where your token was initially launched. The interface provides a list of all available CosmosSDK-based mainnet chains in the [Cosmos chain-registry](https://github.com/cosmos/chain-registry).

### Step 2: Select Token
Input or select your newly launched token from the `denom` field.

### Step 3: Enter Recipient Address
Provide the recipient address on the destination chain where you want to transfer the token. This can be your own address or the address of another user or contract on the destination chain. 

### Step 4: Select Source Channel
The interface may automagically suggest a channel based on available liquidity data. If a recommendation is provided, it will be pre-filled for you. If no recommendation is available, or if you prefer to use a different channel, you can manually enter the channel ID.

### Step 5: Submit Transfer
Submit your transfer by clicking the “🔥 Warm ️‍🔥” button. This will initiate the IBC transfer, thereby  *warming* the route by transfering 1 unit of the token. You can preview the transaction details in the Keplr popup to confirm your selections. 

If your transaction is succesful you will receive a popup with the transaction hash. Skip's liquidity detection algorithm will see this transfer and recommend the selected channel for subsequent IBC transfers of the token.

### Why It's Important
IBC routes are identified by channels, and the channel selected during the transfer informs the token’s denomination on the destination chain. If the wrong channel is chosen, the resulting token may not match the denomination expected by liquidity pools or contracts on the destination chain. 
 
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
- Better infra. App currently has a number of CORS, 429, & other infra-related issues. Osmosis & Neutron are the only chains that works reliably. 
- Reduce calls to Skip API. Currently calls api for source channel reccomendations on field change.
- Validate form fields. Currently only checks if fields are empty. Including somethign like `react-hook-form` or `formik` would be better. Handle edge cases like invalid addresses, no balances on chain etc. 
- Integrate more wallets. Currently only supports Keplr. Could use a library like Cosmology. 
- Allow for multiple fee denoms. E.g. using IBC'd ATOM on Noble. 
- Better channel validation. Implement validation present on Keplr's advanced IBC transfer page. 
- Make it attractive. Currently looks like a 90s website.