import { useState, useEffect } from "react";
import { chains, assets } from "chain-registry";
import { chainRegistryChainToKeplr } from "@chain-registry/keplr";
import { ChainInfo } from "@keplr-wallet/types";
import { validateRestApi, getChainIdFromAddress } from "./common";
import { fetchChannelRecommendation } from "./skip";
import { Coin } from "@cosmjs/stargate";
import { api } from "./api";

export const useChainInfo = (sourceChainId: string) => {
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);

  useEffect(() => {
    const selectedChain = chains.find((chain) => chain.chain_id === sourceChainId);
    if (!selectedChain) return;

    const configureChainInfo = async () => {
      const restEndpoint = await validateRestApi(selectedChain);
      if (!restEndpoint) return;
      const config: ChainInfo = chainRegistryChainToKeplr(selectedChain, assets, {
        getRestEndpoint: () => restEndpoint,
      });
      setChainInfo(config);
    };

    configureChainInfo();
  }, [sourceChainId]);

  return chainInfo;
};

export const useKeplrAddress = (chainInfo: ChainInfo | null) => {
  const [address, setAddress] = useState("");

  useEffect(() => {
    setAddress("");
  }, [chainInfo]);

  const getKeyFromKeplr = async () => {
    if (chainInfo) {
      const key = await window.keplr?.getKey(chainInfo.chainId);
      if (key) {
        setAddress(key.bech32Address);
      }
    }
  };

  return { address, getKeyFromKeplr };
};

export const useChannelRecommendation = (sourceChainId: string, feeDenom: string, recipient: string) => {
  const [sourceChannel, setSourceChannel] = useState("");

  useEffect(() => {
    const updateChannelRecommendation = async () => {
      setSourceChannel("");
      if (feeDenom && sourceChainId && recipient) {
        const channel = await fetchChannelRecommendation({
          sourceDenom: feeDenom,
          sourceChainId,
          destChainId: getChainIdFromAddress(recipient),
        });

        if (channel) setSourceChannel(channel);
      }
    };

    updateChannelRecommendation();
  }, [feeDenom, sourceChainId, recipient]);

  return { sourceChannel, setSourceChannel };
};

  
export const useBalances = (
    chainInfo: ChainInfo | null,
    address: string,
  ): { balances: Coin[]} => {
    const [balances, setBalances] = useState<Coin[]>([]);
  
    useEffect(() => {
      const fetchBalances = async () => {
          if (!chainInfo || !address) return;
        try {
          const response = await api<{ balances: Coin[] }>(
            `${chainInfo.rest}/cosmos/bank/v1beta1/balances/${address}`
          );
          console.log('response', response)
          setBalances(response.balances);
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      };
  
      fetchBalances();
    }, [chainInfo, address]);
  
    return { balances };
};