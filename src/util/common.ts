import { chains } from "chain-registry";
import { Chain } from "@chain-registry/types";
import { api } from "./api";
import { AccountResponse } from "../types/account";
import { bech32 } from "bech32"

export const getChainIdFromAddress = (address: string) => {
    const prefix = address.split('1')[0];
    const chain = chains.find((chain) =>  chain.bech32_prefix === prefix );
    return chain ? chain.chain_id : "";
};

export const validateRestApi = async (chain: Chain) => {
  if (!chain.apis?.rest) return null;

  for (const { address } of chain.apis.rest) {
    try {
      const uri = `${address}/cosmos/bank/v1beta1/balances/${randomAddress(chain.bech32_prefix)}`;
      const res = await api<AccountResponse>(uri);
      if (res) return address;
    }
    catch (e) {
      console.error(`REST endpoint ${address} is not valid.`);
    }
  }

  alert('No valid REST endpoints found for this chain.');
  return null;
};

export function randomAddress(prefix: string) {
  const RANDOM_WORDS = [...Array(64)]
    .map(() => Math.random().toString(16).slice(-1))
    .join("")

  return bech32.encode(prefix, bech32.toWords(Buffer.from(RANDOM_WORDS, "hex")))
}