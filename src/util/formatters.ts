import { ChainInfo } from '@keplr-wallet/types';
import { getTokenMetadata } from './tokenMetadata';

export interface FormatOptions {
  prettyMode: boolean;
  denom: string;
  chainInfo?: ChainInfo | null;
}

/**
 * Format amount from smallest unit to display format
 */
export const formatDisplayAmount = (
  amountInSmallestUnit: string,
  decimals: number,
  prettyMode: boolean = true
): string => {
  if (!prettyMode) {
    return `${amountInSmallestUnit}`;
  }

  if (!decimals || decimals === 0) {
    return amountInSmallestUnit;
  }

  try {
    const divisor = BigInt(10 ** decimals);
    const bigAmount = BigInt(amountInSmallestUnit);
    const whole = bigAmount / divisor;
    const remainder = bigAmount % divisor;

    if (remainder === BigInt(0)) {
      return whole.toString();
    }

    const decimal = remainder.toString().padStart(decimals, '0');
    // Remove trailing zeros
    const trimmedDecimal = decimal.replace(/0+$/, '');

    if (trimmedDecimal === '') {
      return whole.toString();
    }

    // Limit to 6 decimal places for display
    const displayDecimal = trimmedDecimal.substring(0, 6);
    return `${whole}.${displayDecimal}`;
  } catch (error) {
    console.error('Error formatting amount:', error);
    return amountInSmallestUnit;
  }
};

/**
 * Convert pretty amount to smallest unit
 */
export const convertToSmallestUnit = (
  prettyAmount: string,
  decimals: number
): string => {
  if (!decimals || decimals === 0) {
    return prettyAmount;
  }

  try {
    const parts = prettyAmount.split('.');
    const wholePart = parts[0] || '0';
    const decimalPart = parts[1] || '';

    // Pad or truncate decimal part to match decimals
    const paddedDecimal = decimalPart.padEnd(decimals, '0').substring(0, decimals);
    
    // Combine whole and decimal parts
    const combined = wholePart + paddedDecimal;
    
    // Remove leading zeros
    const result = combined.replace(/^0+/, '') || '0';
    
    return result;
  } catch (error) {
    console.error('Error converting to smallest unit:', error);
    return '0';
  }
};

/**
 * Format amount with symbol
 */
export const formatAmountWithSymbol = (
  amount: string,
  symbol: string,
  decimals: number,
  prettyMode: boolean = true
): string => {
  if (!prettyMode) {
    return `${amount} ${symbol}`;
  }

  const formatted = formatDisplayAmount(amount, decimals, prettyMode);
  return `${formatted} ${symbol}`;
};

/**
 * Get token info from chain info (synchronous version for backward compatibility)
 * Note: This will use cached data if available, otherwise returns defaults
 */
export const getTokenInfo = (denom: string, chainInfo: ChainInfo | null) => {
  if (!chainInfo) {
    return { symbol: denom, decimals: 6 };
  }

  const currency = chainInfo.currencies.find(c => c.coinMinimalDenom === denom);
  if (currency) {
    return {
      symbol: currency.coinDenom,
      decimals: currency.coinDecimals
    };
  }

  // Default for unknown tokens
  // Note: For accurate decimals, use getTokenInfoAsync instead
  return { symbol: denom, decimals: 6 };
};

/**
 * Get token info with proper decimal querying from chain
 */
export const getTokenInfoAsync = async (denom: string, chainInfo: ChainInfo | null) => {
  const metadata = await getTokenMetadata(denom, chainInfo);
  return {
    symbol: metadata.symbol,
    decimals: metadata.decimals,
    name: metadata.name,
    description: metadata.description
  };
};