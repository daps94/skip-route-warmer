import { BroadcastMode, ChainInfo, Keplr, StdFee } from "@keplr-wallet/types";
import { AccountResponse } from "../types/account";
import { api } from "./api";
import { AuthInfo, Fee, TxBody, TxRaw } from "@keplr-wallet/proto-types/cosmos/tx/v1beta1/tx";
import { SignMode } from "@keplr-wallet/proto-types/cosmos/tx/signing/v1beta1/signing";
import { PubKey } from "@keplr-wallet/proto-types/cosmos/crypto/secp256k1/keys";
import { Any } from "@keplr-wallet/proto-types/google/protobuf/any";
import Long from "long";
import { Buffer } from "buffer";
import { TendermintTxTracer } from "@keplr-wallet/cosmos";
import { API_OVERRIDE } from "./constants";

export const sendMsgs = async (
  keplr:Keplr,
  chainInfo: ChainInfo,
  sender: string,
  proto: Any[],
  fee: StdFee,
  onSuccess?: (txHash: string) => void,
  memo: string = "",
) => {
  const account = await fetchAccountInfo(chainInfo, sender);
  const { pubKey } = await keplr.getKey(chainInfo.chainId);

  if (account) {
    const signDoc = {
      bodyBytes: TxBody.encode(
        TxBody.fromPartial({
          messages: proto,
          memo,
        })
      ).finish(),
      authInfoBytes: AuthInfo.encode({
        signerInfos: [
          {
            publicKey: {
              typeUrl: "/cosmos.crypto.secp256k1.PubKey",
              value: PubKey.encode({
                key: pubKey,
              }).finish(),
            },
            modeInfo: {
              single: {
                mode: SignMode.SIGN_MODE_DIRECT,
              },
              multi: undefined,
            },
            sequence: account.sequence,
          },
        ],
        fee: Fee.fromPartial({
          amount: fee.amount.map((coin) => {
            return {
              denom: coin.denom,
              amount: coin.amount.toString(),
            };
          }),
          gasLimit: fee.gas,
        }),
      }).finish(),
      chainId: chainInfo.chainId,
      accountNumber: Long.fromString(account.account_number)
    }

    const signed = await keplr.signDirect(
      chainInfo.chainId,
      sender,
      signDoc,
    )

    const signedTx = {
      tx: TxRaw.encode({
        bodyBytes: signed.signed.bodyBytes,
        authInfoBytes: signed.signed.authInfoBytes,
        // @ts-ignore
        signatures: [Buffer.from(signed.signature.signature, "base64")],
      }).finish(),
      signDoc: signed.signed,
    }

    const txHash = await broadcastTxSync(keplr, chainInfo.chainId, signedTx.tx);
    const rpc = API_OVERRIDE[chainInfo.chainId]?.rpc ?? chainInfo.rpc;
    
    const txTracer = new TendermintTxTracer(rpc, "/websocket");
    txTracer.traceTx(txHash).then((tx) => {
      const hash = Buffer.from(txHash).toString('hex')
      onSuccess?.(hash);
    });

  }
}

export const fetchAccountInfo = async (chainInfo: ChainInfo, address: string) => {
  try {
    const uri = `${chainInfo.rest}/cosmos/auth/v1beta1/accounts/${address}`;
    const response = await api<AccountResponse>(uri);
    return response.account;
  } catch (e) {
    return undefined;
  }
}

export const broadcastTxSync = async (
  keplr:Keplr,
  chainId: string,
  tx: Uint8Array,
): Promise<Uint8Array> => {
  return keplr.sendTx(chainId, tx, "sync" as BroadcastMode)
}
