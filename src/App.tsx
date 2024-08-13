import { useEffect, useState } from "react";
import { Dec, DecUtils } from "@keplr-wallet/unit";
import { sendMsgs } from "./util/sendMsgs";
import { simulateMsgs } from "./util/simulateMsgs";
import "./styles/container.css";
import "./styles/item.css";
import { assets, chains } from 'chain-registry';
import { chainRegistryChainToKeplr } from '@chain-registry/keplr';
import { ChainInfo } from '@keplr-wallet/types';
import { MsgTransfer } from "./proto-types-gen/src/ibc/applications/transfer/v1/tx";
import { Coin } from "./proto-types-gen/src/cosmos/base/v1beta1/coin";
import { Height } from "./proto-types-gen/src/ibc/core/client/v1/client";
import Button from "./components/Button";
import InputField from "./components/InputField";


function App() {
  const [address, setAddress] = useState("");
  const [denom, setDenom] = useState("uion");
  const [recipient, setRecipient] = useState("cosmos14pvzmutp80ugg57699527m567tfwzhjaqs8k2p");
  const [originChain, setOriginChain] = useState("osmosis-1");
  const [amount, setAmount] = useState("0.000001");
  const [sourceChannel, setSourceChannel] = useState("channel-1");
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);

  useEffect(() => {
    const selectedChain = chains.find(chain => chain.chain_id === originChain);
    if (selectedChain) {
      const config: ChainInfo = chainRegistryChainToKeplr(selectedChain, assets, {
      // Whispernode widely available & reliable-ish rest endpoint
        getRestEndpoint: (chain) => chain?.apis?.rest?.find((chain) => chain.provider?.includes('WhisperNode'))?.address ?? "", 
      })
      setChainInfo(config);
    }
  }
  , [originChain]);


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


      const token: Coin = {
        denom: denom,
        amount: DecUtils.getTenExponentN(6)
          .mul(new Dec(amount))
          .truncate()
          .toString(),
      };


      const msg: MsgTransfer = {
        sourcePort: "transfer",
        sourceChannel,
        token,
        sender: key.bech32Address,
        receiver: recipient,
        timeoutHeight: timeoutHeight,
        timeoutTimestamp: (Math.floor(Date.now() / 1000) + 600 * 1000000000).toString(), // 10 minutes from now, in nanoseconds,
        memo: "",
      };

      const protoMsg = {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.encode(msg).finish(),
      };

        const gasUsed = await simulateMsgs(
          chainInfo,
          key.bech32Address,
          [protoMsg],
          [{ denom: chainInfo.feeCurrencies[0].coinMinimalDenom, amount }]
        );
        console.log('gasUsed', gasUsed)

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            chainInfo,
            key.bech32Address,
            [protoMsg],
            {
              amount: [{ denom: chainInfo.feeCurrencies[0].coinMinimalDenom, amount }],
              gas: Math.floor(gasUsed * 1.5).toString(),
            }
          );
        }
    }
  };

  return (
    <div className="root-container">
      <div className="item-container">
        <div className="item">
          <div className="item-title">Route Warmer</div>
          <div className="item-content">
              Origin Chain
              <select value={originChain} onChange={(e) => setOriginChain(e.target.value)}>
                Select origin  chain
                {chains
                  // @ts-ignore
                  .filter((chain) => chain?.chain_type === 'cosmos')
                  .map((chain) => (
                    <option key={chain.chain_id} value={chain.chain_id}>
                      {chain.chain_name}
                    </option>
                  ))}
              </select>
            {chainInfo && (
              <>
                <div>
                  <Button label="Get Address" onClick={getKeyFromKeplr} />
                  {address && <div>{address}</div>}
                </div>
                <InputField 
                  label="Recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <InputField 
                  label="Amount"
                  value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
                <InputField 
                  label="Denom"
                  value={denom}
                  onChange={(e) => setDenom(e.target.value)}
                  />
                <InputField 
                  label="Source Channel"
                  value={denom}
                  placeholder="channel-0"
                    onChange={(e) => setSourceChannel(e.target.value)}
                  />
                <Button  label="Warm IBC Route" onClick={sendIBCTransfer} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;