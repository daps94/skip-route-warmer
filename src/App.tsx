import React, { useState, useMemo, useEffect } from "react";
import Button from "./components/Button";
import InputField from "./components/InputField";
import { chains } from "chain-registry";
import { useChainInfo, useKeplrAddress, useChannelRecommendation, useBalances } from "./util/hooks"; 
import { sendMsgs } from "./util/sendMsgs";
import { simulateMsgs } from "./util/simulateMsgs";
import { Coin } from "./proto-types-gen/src/cosmos/base/v1beta1/coin";
import { MsgTransfer } from "./proto-types-gen/src/ibc/applications/transfer/v1/tx";
import { Height } from "./proto-types-gen/src/ibc/core/client/v1/client";
import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";

function App() {
  const [denom, setDenom] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sourceChainId, setSourceChainId] = useState("noble-1");
  const [loading, setLoading] = useState(false);

  const chainInfo = useChainInfo(sourceChainId);
  const { address, getKeyFromKeplr } = useKeplrAddress(chainInfo);
  const { balances } = useBalances(chainInfo, address);
  const feeDenom = useMemo(() => chainInfo?.feeCurrencies?.[0].coinMinimalDenom ?? "", [chainInfo]);
  const { sourceChannel, setSourceChannel } = useChannelRecommendation(sourceChainId, feeDenom, recipient);

  useEffect(() => {
    setDenom(balances[0]?.denom);
  }, [balances]);

  const transfer = async () => {
    if (window.keplr && chainInfo) {
      setLoading(true);
      const key = await window.keplr?.getKey(chainInfo.chainId);
      const timeoutHeight: Height = { revisionNumber: "0", revisionHeight: "0" };
      const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 600) * 1000000000; // 10 minutes in nanoseconds

      const token: Coin = { denom, amount: "1" };
      const msg: MsgTransfer = {
        sourcePort: "transfer",
        sourceChannel,
        token,
        sender: key.bech32Address,
        receiver: recipient,
        timeoutHeight,
        timeoutTimestamp: timeoutTimestamp.toString(),
        memo: "",
      };
      const protoMsg = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.encode(msg).finish(),
      };

      try {
        const gasUsed = await simulateMsgs(chainInfo, key.bech32Address, [protoMsg], 
          [{ denom: feeDenom, amount: "1000" }]);
        if (gasUsed) {
          await sendMsgs(window.keplr, chainInfo, key.bech32Address, [protoMsg], {
            amount: [{ denom: feeDenom, amount: "1000" }],
            gas: Math.floor(gasUsed * 1.5).toString(),
          });
        }
      } catch (e) {
        if (e instanceof Error) {
          alert(e.message);
        }
      }
      setLoading(false);
    }
  };

  const submitDisabled = loading || !denom || !sourceChannel.startsWith("channel-") || !recipient;

  return (
    <div className="root-container">
      <div className="item-container">
        <div className="item">
          <div className="item-title">IBC Route Warmer</div>
          <div className="item-content">
            Origin Chain
            <select value={sourceChainId} onChange={(e) => setSourceChainId(e.target.value)}>
              {chains
              // @ts-ignore
                .filter((chain) => chain?.chain_type === "cosmos" && chain?.network_type === "mainnet")
                .map((chain) => (
                  <option key={chain.chain_id} value={chain.chain_id}>
                    {chain.chain_name}
                  </option>
                ))}
            </select>
            {address ? (
              <>
                <InputField label="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                Denom
                <select value={denom} onChange={(e) => setDenom(e.target.value)}>
                  {balances.map((balance) => (
                    <option key={balance.denom} value={balance.denom}>
                      {balance.denom}
                    </option>
                  ))}
                </select>
                <InputField
                  label="Source Channel"
                  value={sourceChannel}
                  placeholder="channel-0"
                  onChange={(e) => setSourceChannel(e.target.value)}
                />
                <Button
                  disabled={submitDisabled}
                  label={loading ? "Loading..." : "🔥 Warm ️‍🔥"}
                  onClick={transfer}
                />
              </>
            ) : (
              <Button label="Connect" onClick={getKeyFromKeplr} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
