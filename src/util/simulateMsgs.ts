import { ChainInfo } from "@keplr-wallet/types";
import { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import { AuthInfo, Fee, SignerInfo, TxBody, TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import { fetchAccountInfo } from "./sendMsgs";
import { api } from "./api";
import { GasSimulateResponse } from "../types/simulate";

export const simulateMsgs = async (
  chainInfo: ChainInfo,
  sender: string,
  proto: Any[],
  fee:  [{
    denom: string;
    amount: string;
  }],
  memo: string = ""
) => {
    const account = await fetchAccountInfo(chainInfo, sender);
    
    if (account) {
      const unsignedTx = TxRaw.encode({
        bodyBytes: TxBody.encode(
          TxBody.fromPartial({
            messages: proto,
            memo,
          })
        ).finish(),
        authInfoBytes: AuthInfo.encode({
          signerInfos: [
            SignerInfo.fromPartial({
              modeInfo: {
                single: {
                  mode: SignMode.SIGN_MODE_DIRECT,
                },
              },
              sequence: account.sequence,
            }),
          ],
          fee: Fee.fromPartial({
            amount: fee.map((coin) => {
              return {
                denom: coin.denom,
                amount: coin.amount.toString(),
              };
            }),
          }),
        }).finish(),
        signatures: [new Uint8Array(64)],
      }).finish();

      const simulatedResult = await api<GasSimulateResponse>(`${chainInfo.rest}/cosmos/tx/v1beta1/simulate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          tx_bytes: Buffer.from(unsignedTx).toString("base64")
        })
      });

      const gasUsed = parseInt(simulatedResult.gas_info.gas_used);
      if (Number.isNaN(gasUsed)) {
        throw new Error(`Invalid integer gas: ${simulatedResult.gas_info.gas_used}`);
      }

      return gasUsed;
  }
};
