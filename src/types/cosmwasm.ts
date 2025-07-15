// CosmWasm types for MsgExecuteContract
import { Coin } from "@cosmjs/stargate";

export interface MsgExecuteContract {
  sender: string;
  contract: string;
  msg: string; // Base64 encoded JSON
  funds: Coin[];
}

// Type for encoding MsgExecuteContract
export const MsgExecuteContract = {
  encode(message: MsgExecuteContract): Uint8Array {
    // This is a simplified encoding - in production, use proper protobuf encoding
    const encoder = new TextEncoder();
    const json = JSON.stringify({
      sender: message.sender,
      contract: message.contract,
      msg: message.msg,
      funds: message.funds
    });
    return encoder.encode(json);
  },
  
  fromJSON(object: any): MsgExecuteContract {
    return {
      sender: object.sender || "",
      contract: object.contract || "",
      msg: object.msg || "",
      funds: Array.isArray(object.funds) ? object.funds : []
    };
  },
  
  toJSON(message: MsgExecuteContract): unknown {
    const obj: any = {};
    message.sender !== undefined && (obj.sender = message.sender);
    message.contract !== undefined && (obj.contract = message.contract);
    message.msg !== undefined && (obj.msg = message.msg);
    if (message.funds) {
      obj.funds = message.funds.map((e) => e);
    } else {
      obj.funds = [];
    }
    return obj;
  }
};