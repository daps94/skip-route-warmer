import { useState, useEffect } from "react";
import { api } from "./api";
import { ChainInfo } from "@keplr-wallet/types";
import { Coin } from "@cosmjs/stargate";

interface UseBalancesResult {
  balances: Coin[];
}

export const useBalances = (
  chainInfo: ChainInfo | null,
  address: string,
): UseBalancesResult => {
  const [balances, setBalances] = useState<Coin[]>([]);

  useEffect(() => {
    const fetchBalances = async () => {
        if (!chainInfo || !address) return;
      try {
        const response = await api<{ balances: Coin[] }>(
          `${chainInfo.rest}/cosmos/bank/v1beta1/balances/${address}`
        );
        setBalances(response.balances);
      } catch (error) {
        console.error("Failed to fetch balances:", error);
      }
    };

    fetchBalances();
  }, [chainInfo, address]);

  return { balances };
};