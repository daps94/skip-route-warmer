// Proper protobuf encoding for MsgExecuteContract
import { Coin } from "@cosmjs/stargate";

// Field numbers for protobuf encoding
const FIELD_SENDER = 1;
const FIELD_CONTRACT = 2;
const FIELD_MSG = 3;
const FIELD_FUNDS = 5;

// Helper functions for protobuf encoding
function encodeVarint(value: number): Uint8Array {
  const buffer: number[] = [];
  while (value > 127) {
    buffer.push((value & 0x7f) | 0x80);
    value >>>= 7;
  }
  buffer.push(value);
  return new Uint8Array(buffer);
}

function encodeTag(fieldNumber: number, wireType: number): Uint8Array {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeString(fieldNumber: number, value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  const tag = encodeTag(fieldNumber, 2); // wire type 2 for length-delimited
  const length = encodeVarint(encoded.length);
  
  const result = new Uint8Array(tag.length + length.length + encoded.length);
  result.set(tag, 0);
  result.set(length, tag.length);
  result.set(encoded, tag.length + length.length);
  
  return result;
}

function encodeBytes(fieldNumber: number, value: Uint8Array): Uint8Array {
  const tag = encodeTag(fieldNumber, 2); // wire type 2 for length-delimited
  const length = encodeVarint(value.length);
  
  const result = new Uint8Array(tag.length + length.length + value.length);
  result.set(tag, 0);
  result.set(length, tag.length);
  result.set(value, tag.length + length.length);
  
  return result;
}

function encodeCoin(coin: Coin): Uint8Array {
  const denom = encodeString(1, coin.denom);
  const amount = encodeString(2, coin.amount);
  
  const result = new Uint8Array(denom.length + amount.length);
  result.set(denom, 0);
  result.set(amount, denom.length);
  
  return result;
}

export function encodeMsgExecuteContract(
  sender: string,
  contract: string,
  msg: Uint8Array,
  funds: Coin[]
): Uint8Array {
  const parts: Uint8Array[] = [];
  
  // Encode sender
  parts.push(encodeString(FIELD_SENDER, sender));
  
  // Encode contract
  parts.push(encodeString(FIELD_CONTRACT, contract));
  
  // Encode msg (as bytes)
  parts.push(encodeBytes(FIELD_MSG, msg));
  
  // Encode funds
  for (const coin of funds) {
    const encodedCoin = encodeCoin(coin);
    parts.push(encodeBytes(FIELD_FUNDS, encodedCoin));
  }
  
  // Calculate total length
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  
  // Combine all parts
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  
  return result;
}