import { chains } from "chain-registry";

export const getChainIdFromAddress = (address: string) => {
    const prefix = address.split('1')[0];
    const chain = chains.find((chain) =>  chain.bech32_prefix === prefix );
    return chain ? chain.chain_id : "";
  };