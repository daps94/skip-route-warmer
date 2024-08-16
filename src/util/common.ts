import { Chain } from "@chain-registry/types";
import { api } from "./api";
import { API_OVERRIDE } from "./constants";
import { bech32 } from "bech32";
import { chains } from "chain-registry";

type ApiEndpoints = {
  rest: string | null;
  rpc: string | null;
};

type ApiType = keyof typeof API_OVERRIDE[string];

export const validateApiEndpoints = async (chain: Chain): Promise<ApiEndpoints> => {

  const validateEndpoint = async (type: ApiType): Promise<string | null> => {
    const apis = chain.apis?.[type];
    if (!apis) return null;

    const override = API_OVERRIDE[chain.chain_id]?.[type];
    if (override) return override;

    const uriSuffix = type === 'rest' 
        ? `/cosmos/bank/v1beta1/balances/${randomAddress(chain.bech32_prefix)}`
        : '/status';

    for (const { address } of apis) {
      try {
        const uri = `${address}${uriSuffix}`;
        const res = await api(uri);
        if (res) return address;
      } catch (e) {
        console.error(`${type} endpoint ${address} is not valid.`);
      }
    }

    alert(`No valid ${type} endpoints found for this chain.`);
    return null;
  };

  const [rest, rpc] = await Promise.all([
    validateEndpoint('rest'),
    validateEndpoint('rpc'),
  ]);

  return { rest, rpc };
};

export function randomAddress(prefix: string) {
  const RANDOM_WORDS = [...Array(64)]
    .map(() => Math.random().toString(16).slice(-1))
    .join("");

  return bech32.encode(prefix, bech32.toWords(Buffer.from(RANDOM_WORDS, "hex")));
}

export const getChainIdFromAddress = (address: string) => {
  const prefix = address.split('1')[0];
  const chain = chains.find((chain) =>  chain.bech32_prefix === prefix );
  return chain ? chain.chain_id : "";
};