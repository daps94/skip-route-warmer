import React, { useEffect, useMemo, useState } from "react";
import { sendMsgs } from "./util/sendMsgs";
import { simulateMsgs } from "./util/simulateMsgs";
import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";
import { assets, chains } from 'chain-registry';
import { chainRegistryChainToKeplr } from '@chain-registry/keplr';
import { ChainInfo } from '@keplr-wallet/types';
import { MsgTransfer } from "./proto-types-gen/src/ibc/applications/transfer/v1/tx";
import { Coin } from "./proto-types-gen/src/cosmos/base/v1beta1/coin";
import { Height } from "./proto-types-gen/src/ibc/core/client/v1/client";
import Button from "./components/Button";
import InputField from "./components/InputField";
import { fetchChannelRecommendation } from "./util/skip";
import { getChainIdFromAddress, validateRestApi } from "./util/common";

function App() {
  const [address, setAddress] = useState("");
  const [denom, setDenom] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sourceChainId, setsourceChainId] = useState("osmosis-1");
  const [sourceChannel, setSourceChannel] = useState("");
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const feeDenom = useMemo(() => 
    chainInfo?.feeCurrencies?.[0].coinMinimalDenom ?? "" , [chainInfo]
); 

useEffect(() => {
  const selectedChain = chains.find(chain => chain.chain_id === sourceChainId);
  if (!selectedChain) return

  const configureChainInfo = async () => {
    const restEndpoint = await validateRestApi(selectedChain);
    if (!restEndpoint) return;
    const config: ChainInfo = chainRegistryChainToKeplr(selectedChain, assets, {
      getRestEndpoint: () => restEndpoint, 
    });
    setChainInfo(config);
  }

  configureChainInfo();
}, [sourceChainId]);

  useEffect(() => {
    setAddress("");
  }, [chainInfo])

  useEffect(() => {
    if (!window.keplr) alert("Please install Keplr extension");
  }, [])

  useEffect(() => {
    const updateChannelRecommendation = async () => {
      setSourceChannel("");
      if (feeDenom && sourceChainId && recipient) {
        const channel = await fetchChannelRecommendation({
          sourceDenom: feeDenom,
          sourceChainId,
          destChainId: getChainIdFromAddress(recipient), // Assuming recipient chain ID is the correct one
        });

        if (channel) setSourceChannel(channel);
      }
    };

    updateChannelRecommendation();
  }, [feeDenom, sourceChainId, recipient]);


  const getKeyFromKeplr = async () => {
    if (chainInfo) {
      const key = await window.keplr?.getKey(chainInfo.chainId);
      if (key) {
        setAddress(key.bech32Address);
      }
    }
  };

  const transfer = async () => {
    if (window.keplr && chainInfo) {
      setLoading(true)
      const key = await window.keplr?.getKey(chainInfo.chainId);
      const timeoutHeight: Height = {
        revisionNumber: "0",
        revisionHeight: "0",
      };

      const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 600) * (1000000000); // 10 minutes from now, in nanoseconds

      const token: Coin = {
        denom,
        amount: "1"
      };

      const msg: MsgTransfer = {
        sourcePort: "transfer",
        sourceChannel,
        token: token,
        sender: key.bech32Address,
        receiver: recipient,
        timeoutHeight: timeoutHeight,
        timeoutTimestamp: timeoutTimestamp.toString(),
        memo: "",
      };

      const protoMsg = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.encode(msg).finish(),
      };

      try {
        const gasUsed = await simulateMsgs(
          chainInfo,
          key.bech32Address,
          [protoMsg],
          [{ denom: feeDenom, amount: token.amount }]
        );

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            chainInfo,
            key.bech32Address,
            [protoMsg],
            {
              amount: [{ denom: feeDenom, amount: token.amount }],
              gas: Math.floor(gasUsed * 1.5).toString(),
            }
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          alert(e.message);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div className="root-container">
      <div className="item-container">
        <div className="item">
          <div className="item-title">IBC Route Warmer</div>
          <div className="item-content">
              Origin Chain
              <select value={sourceChainId} onChange={(e) => setsourceChainId(e.target.value)}>
                {chains
                  // @ts-ignore
                  .filter((chain) => chain?.chain_type === 'cosmos' && chain?.network_type === 'mainnet')
                  .map((chain) => (
                    <option key={chain.chain_id} value={chain.chain_id}>
                      {chain.chain_name}
                    </option>
                  ))}
              </select>
              {address ? (
                <>
                <div>Address: {address}</div>
                  <InputField 
                    label="Recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  <InputField 
                    label="Denom"
                    value={denom}
                    placeholder="native, factory, or IBC token denom on origin chain"
                    onChange={(e) => setDenom(e.target.value)}
                  />
                  <InputField 
                    label="Source Channel"
                    value={sourceChannel}
                    placeholder="channel-0"
                    onChange={(e) => setSourceChannel(e.target.value)}
                  />
                  <Button disabled={loading || !denom || !sourceChannel.startsWith("channel-") || !recipient}
                    label={loading ? "Loading..." : "🔥 Warm ️‍🔥"} onClick={transfer} 
                  />
                </>
              )
              : <Button label="Connect" onClick={getKeyFromKeplr} />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;