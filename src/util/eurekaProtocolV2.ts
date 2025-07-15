import { EncodeObject } from "@cosmjs/proto-signing";
import { Coin } from "@cosmjs/stargate";
import { EUREKA_CONTRACT_ADDRESS, EUREKA_CHANNEL } from "./eureka.constants";
import { encodeMsgExecuteContract } from "./cosmwasmCodec";

interface EurekaTransferParams {
  sourceChainId: string;
  destinationChainId: string;
  sender: string;
  receiver: string; // Ethereum address for Cosmos Hub to Ethereum
  amount: string;
  denom: string;
  memo?: string;
}

interface EurekaExecuteMsg {
  action: {
    timeout_timestamp: number;
    action: {
      ibc_transfer: {
        ibc_info: {
          source_channel: string;
          receiver: string;
          memo: string;
          recover_address: string;
          encoding: string;
        };
      };
    };
    exact_out: boolean;
  };
}

export function createEurekaExecuteContractMsg(params: EurekaTransferParams): EncodeObject {
  const timeoutTimestamp = Math.floor(Date.now() / 1000) + 43200; // 12 hours in seconds

  // Create the execute message for Eureka
  const executeMsg: EurekaExecuteMsg = {
    action: {
      timeout_timestamp: timeoutTimestamp,
      action: {
        ibc_transfer: {
          ibc_info: {
            source_channel: EUREKA_CHANNEL,
            receiver: params.receiver, // Ethereum address
            memo: params.memo || "",
            recover_address: params.sender, // Use sender as recover address
            encoding: "application/x-solidity-abi"
          }
        }
      },
      exact_out: false
    }
  };

  // Convert the message to JSON bytes directly (not base64)
  const msgString = JSON.stringify(executeMsg);
  const msgBytes = new TextEncoder().encode(msgString);

  // Create the funds array
  const funds: Coin[] = [{
    denom: params.denom,
    amount: params.amount
  }];

  // Encode the MsgExecuteContract using proper protobuf encoding
  // Pass the JSON bytes directly, not base64 encoded
  const encodedMsg = encodeMsgExecuteContract(
    params.sender,
    EUREKA_CONTRACT_ADDRESS,
    msgBytes, // Pass JSON bytes directly
    funds
  );

  return {
    typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
    value: encodedMsg,
  };
}

export function validateEurekaRoute(
  sourceChainId: string,
  destinationChainId: string,
  amount: string,
  minAmount: string
): { valid: boolean; error?: string } {
  // Check minimum amount for Eureka routes
  if (BigInt(amount) < BigInt(minAmount)) {
    return { 
      valid: false, 
      error: `Minimum amount for Eureka routes is ${minAmount} (smallest unit)` 
    };
  }

  // For Eureka, we only support Cosmos Hub to Ethereum
  if (sourceChainId !== "cosmoshub-4" || destinationChainId !== "1") {
    return { 
      valid: false, 
      error: `Eureka only supports Cosmos Hub to Ethereum routes` 
    };
  }

  return { valid: true };
}

export function calculateEurekaFees(
  amount: string,
  sourceChainId: string,
  destinationChainId: string
): {
  protocolFee: string;
  relayerFee: string;
  totalFee: string;
} {
  // Base protocol fee: 0.1%
  const protocolFee = (BigInt(amount) * BigInt(1) / BigInt(1000)).toString();
  
  // Relayer fee for Ethereum: 1%
  const relayerFee = (BigInt(amount) * BigInt(10) / BigInt(1000)).toString();
  const totalFee = (BigInt(protocolFee) + BigInt(relayerFee)).toString();

  return {
    protocolFee,
    relayerFee,
    totalFee
  };
}