import React, { useState } from "react";
import { Dec, DecUtils } from "@keplr-wallet/unit";
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

function App() {
  const [address, setAddress] = useState("");
  const [denom, setDenom] = useState("");
  const [recipient, setRecipient] = useState("");
  const [originChain, setOriginChain] = useState("");
  const [amount, setAmount] = useState("");
  const [channelId, setChannelId] = useState("");
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);

  const onChainSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedChainId = e.target.value;
    setOriginChain(selectedChainId);

    const selectedChain = chains.find(chain => chain.chain_id === selectedChainId);
    if (selectedChain) {
      const config: ChainInfo = chainRegistryChainToKeplr(selectedChain, assets, {
        getRestEndpoint: (chain) => chain.apis?.rest?.[0]?.address ?? "",
        getRpcEndpoint: (chain) => chain.apis?.rpc?.[0]?.address ?? ""
      });
      console.log('config', config);
      setChainInfo(config);
    }
  };

  const getKeyFromKeplr = async () => {
    if (chainInfo) {
      const key = await window.keplr?.getKey(chainInfo.chainId);
      if (key) {
        setAddress(key.bech32Address);
      }
    }
  };

  const sendIBCTransfer = async () => {
    if (window.keplr && chainInfo) {
      const key = await window.keplr?.getKey(chainInfo.chainId);
  
      
      const timeoutHeight: Height = {
        revisionNumber: "0",
        revisionHeight: "0",
      };

      const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 600) * (1000000000); // 10 minutes from now, in nanoseconds

      const token: Coin = {
        denom: denom,
        amount: DecUtils.getTenExponentN(6)
          .mul(new Dec(amount))
          .truncate()
          .toString(),
      };

      const msg: MsgTransfer = {
        sourcePort: "transfer",
        sourceChannel: channelId,
        token: token,
        sender: key.bech32Address,
        receiver: recipient,
        timeoutHeight: timeoutHeight,
        timeoutTimestamp: timeoutTimestamp.toString(),
        memo: "",
      };
      console.log('msg', msg)

      const protoMsg = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.encode(msg).finish(),
      };

      try {
        const gasUsed = await simulateMsgs(
          chainInfo,
          key.bech32Address,
          [protoMsg],
          [{ denom: chainInfo.feeCurrencies[0].coinMinimalDenom, amount: "236" }]
        );
        console.log('gasUsed', gasUsed)

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            chainInfo,
            key.bech32Address,
            [protoMsg],
            {
              amount: [{ denom: chainInfo.feeCurrencies[0].coinMinimalDenom, amount: "236" }],
              gas: Math.floor(gasUsed * 1.5).toString(),
            }
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          console.log(e.message);
        }
      }
    }
  };

  return (
    <div className="root-container">
      <div className="item-container">
        <div className="item">
          <div className="item-title">Warm IBC Route</div>

          <div className="item-content">
            <div>
              Origin Chain
              <select value={originChain} onChange={onChainSelect}>
                <option value="">Select a chain</option>
                {chains
                // @ts-ignore
                .filter((chain) => chain?.chain_type === 'cosmos')
                .map((chain) => (
                  <option key={chain.chain_id} value={chain.chain_id}>
                    {chain.chain_name}
                  </option>
                ))}
              </select>
            </div>

            {chainInfo && (
              <>
                <div>
                  <button className="keplr-button" onClick={getKeyFromKeplr}>
                    Get Address
                  </button>
                  <div>Address: {address}</div>
                </div>

                <div>
                  Recipient
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                <div>
                  Amount
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div>
                  Denom
                  <input
                    type="text"
                    value={denom}
                    onChange={(e) => setDenom(e.target.value)}
                  />
                </div>

                <div>
                  Channel ID
                  <input
                    type="text"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                  />
                </div>

                <button className="keplr-button" onClick={sendIBCTransfer}>
                  Warm IBC Route
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;