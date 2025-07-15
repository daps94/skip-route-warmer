import { EncodeObject } from "@cosmjs/proto-signing";
import { MsgTransfer } from "@keplr-wallet/proto-types/ibc/applications/transfer/v1/tx";
import { Height } from "@keplr-wallet/proto-types/ibc/core/client/v1/client";
import { Coin } from "@cosmjs/stargate";

interface EurekaTransferParams {
  sourceChainId: string;
  destinationChainId: string;
  sender: string;
  receiver: string;
  amount: string;
  denom: string;
  sourceChannel: string;
  eurekaContract: string;
  eurekaChannel: string;
  ethereumReceiver?: string;
  memo?: string;
}

interface EurekaMsg {
  action: {
    action: {
      ibc_transfer: {
        ibc_info: {
          encoding: string;
          eureka_fee?: {
            coin: {
              amount: string;
              denom: string;
            };
            receiver: string;
            timeout_timestamp: number;
          };
          memo: string;
          receiver: string;
          recover_address: string;
          source_channel: string;
        };
      };
    };
    exact_out: boolean;
    timeout_timestamp: number;
  };
}

export function createEurekaTransferMsg(params: EurekaTransferParams): EncodeObject {
  const timeoutHeight: Height = { revisionNumber: "0", revisionHeight: "0" };
  const timeoutTimestamp = (Math.floor(Date.now() / 1000) + 600) * 1000000000;

  // Calculate Eureka fee (example: 1% of transfer amount)
  const eurekaFeeAmount = (BigInt(params.amount) * BigInt(1) / BigInt(100)).toString();

  // Construct the Eureka message for the memo
  const eurekaMsg: EurekaMsg = {
    action: {
      action: {
        ibc_transfer: {
          ibc_info: {
            encoding: params.ethereumReceiver ? "application/x-solidity-abi" : "application/json",
            eureka_fee: {
              coin: {
                amount: eurekaFeeAmount,
                denom: params.denom
              },
              receiver: params.eurekaContract,
              timeout_timestamp: timeoutTimestamp + 1000000000 // Extra time for Eureka processing
            },
            memo: params.memo || "",
            receiver: params.ethereumReceiver || params.receiver,
            recover_address: params.sender,
            source_channel: params.eurekaChannel
          }
        }
      },
      exact_out: false,
      timeout_timestamp: timeoutTimestamp + 5000000000 // 5 seconds extra
    }
  };

  // Create the wrapped memo for Eureka
  const wrappedMemo = {
    dest_callback: {
      address: params.receiver
    },
    wasm: {
      contract: params.eurekaContract,
      msg: eurekaMsg
    }
  };

  const token: Coin = { 
    denom: params.denom, 
    amount: params.amount 
  };

  const msg: MsgTransfer = {
    sourcePort: "transfer",
    sourceChannel: params.sourceChannel,
    token,
    sender: params.sender,
    receiver: params.receiver,
    timeoutHeight,
    timeoutTimestamp: timeoutTimestamp.toString(),
    memo: JSON.stringify(wrappedMemo)
  };

  return {
    typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
    value: MsgTransfer.encode(msg).finish(),
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

  // Check if route is supported
  const supportedRoutes = [
    ["seda-1", "cosmoshub-4"],
    ["cosmoshub-4", "1"], // 1 represents Ethereum
    ["osmosis-1", "cosmoshub-4"],
    ["osmosis-1", "1"],
  ];

  const routeSupported = supportedRoutes.some(
    ([src, dst]) => src === sourceChainId && dst === destinationChainId
  );

  if (!routeSupported) {
    return { 
      valid: false, 
      error: `Route from ${sourceChainId} to ${destinationChainId} is not supported via Eureka` 
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
  
  // Relayer fee varies by destination
  let relayerFeePercentage = BigInt(1); // 0.1% default
  if (destinationChainId === "1") { // Ethereum
    relayerFeePercentage = BigInt(10); // 1% for Ethereum routes
  }
  
  const relayerFee = (BigInt(amount) * relayerFeePercentage / BigInt(1000)).toString();
  const totalFee = (BigInt(protocolFee) + BigInt(relayerFee)).toString();

  return {
    protocolFee,
    relayerFee,
    totalFee
  };
}