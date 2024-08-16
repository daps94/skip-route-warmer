import { useState, useMemo, useEffect } from "react";
import { Coin } from "@cosmjs/stargate";
import { MsgTransfer } from "@keplr-wallet/proto-types/ibc/applications/transfer/v1/tx";
import { Height } from "@keplr-wallet/proto-types/ibc/core/client/v1/client";
import { chains } from "chain-registry";

import Button from "./components/Button";
import CustomSelect from "./components/CustomSelect";
import InputField from "./components/InputField";

import { useChainInfo, useKeplrAddress, useChannelRecommendation, useBalances, useBlockExplorer } from "./util/hooks";
import { sendMsgs } from "./util/sendMsgs";
import { simulateMsgs } from "./util/simulateMsgs";

import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";

function App() {
  const [denom, setDenom] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sourceChainId, setSourceChainId] = useState("osmosis-1");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");

  const chainInfo = useChainInfo(sourceChainId);
  const explorer =  useBlockExplorer(sourceChainId);
  const { address, getKeyFromKeplr } = useKeplrAddress(chainInfo);
  const { balances } = useBalances(chainInfo, address);
  const feeDenom = useMemo(() => chainInfo?.feeCurrencies?.[0].coinMinimalDenom ?? "", [chainInfo]);
  const { sourceChannel, setSourceChannel } = useChannelRecommendation(sourceChainId, feeDenom, recipient);

  const transfer = async () => {
    if (window.keplr && chainInfo) {
      setLoading(true);
      const key = await window.keplr.getKey(chainInfo.chainId);
      const timeoutHeight: Height = { revisionNumber: "0", revisionHeight: "0" };
      const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 600) * 1000000000;

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
        const gasUsed = await simulateMsgs(chainInfo, key.bech32Address, [protoMsg], [{ denom: feeDenom, amount: "1000" }]);

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            chainInfo,
            key.bech32Address,
            [protoMsg],
            {
              amount: [{ denom: feeDenom, amount: "1000" }],
              gas: Math.floor(gasUsed * 1.5).toString(),
            },
            (hash: string) => {
              setDenom("");
              setRecipient("");
              setSourceChannel("");
              setLoading(false);
              setTxHash(hash);
            }
          );
        }
      } catch (e) {
        if (e instanceof Error) {
          alert(e.message);
          setLoading(false);
        }
      } 
    }
  };

  const submitDisabled = loading || !denom || !sourceChannel.startsWith("channel-") || !recipient;

  return (
    <div className="root-container">
      <div className="item-container">
        <div className="item">
          <div className="item-title">IBC Route Warmer</div>
          <div className="item-content">
            <CustomSelect
              label="Source Chain"
              options={chains
                // @ts-ignore
                .filter((chain) => chain?.chain_type === "cosmos" && chain?.network_type === "mainnet")
                .map((chain) => ({ value: chain.chain_id, label: chain.chain_name }))}
              value={sourceChainId}
              onChange={(e) => setSourceChainId(e.target.value)}
            />
            {address ? (
              <>
                <InputField name="address" label="Your Connected Address" value={address} disabled />
                <CustomSelect
                  label="Denom"
                  options={balances.map((balance) => ({ value: balance.denom, label: balance.amount }))}
                  value={denom}
                  placeholder="Select the token whose route you want to warm"
                  onChange={(e) => setDenom(e.target.value)}
                />
                <InputField name="recipient" label="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                <InputField
                  label="Source Channel"
                  value={sourceChannel}
                  placeholder="channel-0"
                  onChange={(e) => setSourceChannel(e.target.value)}
                />
               {txHash && !loading && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={explorer.replace("${txHash}", txHash)}
                  >
                    Success! See Transaction
                  </a>
                )}
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
