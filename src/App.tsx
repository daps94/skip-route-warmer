import React, { useEffect } from "react";
import { Balances } from "./types/balance";
import { Dec, DecUtils } from "@keplr-wallet/unit";
import { isAddress } from "@ethersproject/address";
import { sendMsgs } from "./util/sendMsgs";
import { api } from "./util/api";
import { simulateMsgs } from "./util/simulateMsgs";
import { MsgSend } from "./proto-types-gen/src/cosmos/bank/v1beta1/tx";
import "./styles/container.css";
import "./styles/button.css";
import "./styles/item.css";
import { assets, chains, ibc,} from 'chain-registry';
import { chainRegistryChainToKeplr } from '@chain-registry/keplr';
import { ChainInfo } from '@keplr-wallet/types';

function App() {
  const [address, setAddress] = React.useState<string>("");
  // const [balance, setBalance] = React.useState<string>("");
  const [denom, setDenom] = React.useState<string>("");
  const [recipient, setRecipient] = React.useState<string>("");
  const [originChain, setOriginChain] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  console.log('chains', chains)

  // useEffect(() => {
  //   init();
  // }, []);

  // const init = async () => {
  //   const keplr = window.keplr;
  //   if (keplr) {
  //     try {
  //       await keplr.experimentalSuggestChain(OsmosisChainInfo);
  //     } catch (e) {
  //       if (e instanceof Error) {
  //         console.log(e.message);
  //       }
  //     }
  //   }
  // };

  const getKeyFromKeplr = async () => {
    const key = await window.keplr?.getKey(OsmosisChainInfo.chainId);
    if (key) {
      setAddress(key.bech32Address);
    }
  };

  // const getBalance = async () => {
  //   const key = await window.keplr?.getKey(OsmosisChainInfo.chainId);

  //   if (key) {
  //     const uri = `${OsmosisChainInfo.rest}/cosmos/bank/v1beta1/balances/${key.bech32Address}?pagination.limit=1000`;

  //     const data = await api<Balances>(uri);
  //     const balance = data.balances.find(
  //       (balance) => balance.denom === "uosmo"
  //     );
  //     const osmoDecimal = OsmosisChainInfo.currencies.find(
  //       (currency) => currency.coinMinimalDenom === "uosmo"
  //     )?.coinDecimals;

  //     if (balance) {
  //       const amount = new Dec(balance.amount, osmoDecimal);
  //       setBalance(`${amount.toString(osmoDecimal)} OSMO`);
  //     } else {
  //       setBalance(`0 OSMO`);
  //     }
  //   }
  // };

  const onChainSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {


  const config: ChainInfo = chainRegistryChainToKeplr(chain, assets);

// you can add options as well to choose endpoints 
const config: ChainInfo = chainRegistryChainToKeplr(chain, assets, {
    getRestEndpoint: (chain) => chain.apis?.rest[1]?.address
    getRpcEndpoint: (chain) => chain.apis?.rpc[1]?.address
});

  const sendBalance = async () => {
    if (window.keplr) {
      const key = await window.keplr?.getKey(originChain);
      const protoMsgs = {
        typeUrl: "/cosmos.bank.v1beta1.MsgSend",
        value: MsgSend.encode({
          fromAddress: key.bech32Address,
          toAddress: recipient,
          amount: [
            {
              denom,
              amount: DecUtils.getTenExponentN(6)
                .mul(new Dec(amount))
                .truncate()
                .toString(),
            },
          ],
        }).finish(),
      };

      try {
        const gasUsed = await simulateMsgs(
          OsmosisChainInfo,
          key.bech32Address,
          [protoMsgs],
          [{ denom: "uosmo", amount: "236" }]
        );

        if (gasUsed) {
          await sendMsgs(
            window.keplr,
            OsmosisChainInfo,
            key.bech32Address,
            [protoMsgs],
            {
              amount: [{ denom: "uosmo", amount: "236" }],
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
        {/* <div className="item">
          <div className="item-title">Get OSMO Address</div>

          <div className="item-content">
            <div>
              <button className="keplr-button" onClick={getKeyFromKeplr}>
                Get Address
              </button>
            </div>
            <div>Address: {address}</div>
          </div>
        </div>

        <div className="item">
          <div className="item-title">Get OSMO Balance</div>

          <div className="item-content">
            <button className="keplr-button" onClick={getBalance}>
              Get Balance
            </button>

            <div>Balance: {balance}</div>
          </div>
        </div> */}

        <div className="item">
          <div className="item-title">Warm Route</div>

          <div className="item-content">
            origin chain
            <select>
              {chains.map((chain) => (
                <option key={chain.chain_id} onChange={onChainSelect} value={chain.chain_id}>
                  {chain.chain_name}
                </option>
              ))}
            </select>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              recipient
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              amount
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              channel-id
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <button className="keplr-button" onClick={sendBalance}>
              Warm
            </button>
          </div>
        </div>
      </div>

     
    </div>
  );
}

export default App;
