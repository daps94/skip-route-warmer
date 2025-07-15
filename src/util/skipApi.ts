import { api } from "./api";
import { SKIP_BASE_API } from "./constants";
import { EUREKA_CHANNEL } from "./eureka.constants";

interface SkipRoute {
  source_asset_denom: string;
  source_asset_chain_id: string;
  dest_asset_denom: string;
  dest_asset_chain_id: string;
  amount_in: string;
  amount_out: string;
  operations: Array<{
    type: string;
    chain_id: string;
    denom_in: string;
    denom_out: string;
  }>;
  estimated_fees: Array<{
    chain_id: string;
    denom: string;
    amount: string;
  }>;
}

interface SkipMsg {
  multi_chain_msg: {
    chain_id: string;
    path: string[];
    msg: string;
    msg_type_url: string;
  };
}

interface EurekaForwardMsg {
  forward: {
    receiver: string;
    port: string;
    channel: string;
    timeout: string;
    retries: number;
    next?: {
      forward: {
        receiver: string;
        port: string;
        channel: string;
        timeout: string;
        retries: number;
      };
    } | null;
  };
}

export interface RouteRequest {
  source_asset_denom: string;
  source_asset_chain_id: string;
  dest_asset_denom: string;
  dest_asset_chain_id: string;
  amount_in: string;
  cumulative_affiliate_fee_bps?: string;
  client_id?: string;
}

export interface MsgRequest {
  source_asset_denom: string;
  source_asset_chain_id: string;
  dest_asset_denom: string;
  dest_asset_chain_id: string;
  amount_in: string;
  address_list: string[];
  operations: Array<{
    type: string;
    [key: string]: any;
  }>;
  estimated_amount_out?: string;
  slippage_tolerance_percent?: string;
  affiliates?: Array<{
    basis_points_fee: string;
    address: string;
  }>;
}

export const fetchRecommendedRoute = async (request: RouteRequest): Promise<SkipRoute | null> => {
  try {
    const response = await api<{ recommendations: SkipRoute[] }>(
      `${SKIP_BASE_API}/fungible/routes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          cumulative_affiliate_fee_bps: request.cumulative_affiliate_fee_bps || "0",
          client_id: request.client_id || "skip-route-warmer"
        }),
      }
    );

    return response.recommendations?.[0] || null;
  } catch (error) {
    console.error('Error fetching route recommendation:', error);
    return null;
  }
};

export const constructSkipMsg = async (request: MsgRequest): Promise<SkipMsg | null> => {
  try {
    const response = await api<{ msgs: SkipMsg[] }>(
      `${SKIP_BASE_API}/fungible/msgs`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...request,
          slippage_tolerance_percent: request.slippage_tolerance_percent || "1",
          affiliates: request.affiliates || []
        }),
      }
    );

    return response.msgs?.[0] || null;
  } catch (error) {
    console.error('Error constructing Skip message:', error);
    return null;
  }
};

export const constructEurekaMsg = (
  destinationChainId: string,
  finalReceiver: string,
  sourceChannel: string,
  timeoutTimestamp: string
): any => {
  // For direct Cosmos Hub to Ethereum routing
  // The message structure should include the path as requested: ["cosmoshub-4", "1"]
  
  if (destinationChainId === "1" || destinationChainId === "ethereum") {
    return {
      forward: {
        receiver: finalReceiver, // Ethereum address
        port: "transfer",
        channel: sourceChannel, // Channel from Cosmos Hub to Ethereum
        timeout: timeoutTimestamp,
        retries: 2,
        path: ["cosmoshub-4", "1"] // Direct path from Cosmos Hub to Ethereum
      }
    };
  }
  
  // For other destinations (shouldn't happen in simplified version)
  return {
    forward: {
      receiver: finalReceiver,
      port: "transfer",
      channel: sourceChannel,
      timeout: timeoutTimestamp,
      retries: 2,
      path: ["cosmoshub-4", destinationChainId]
    }
  };
};

// Fee estimation removed - now using local calculation for Eureka routes

export const getChannelForRoute = async (
  sourceChainId: string,
  destChainId: string,
  denom: string
): Promise<string | null> => {
  try {
    // For Eureka routes, we need specific channels
    const eurekaChannels: Record<string, Record<string, string>> = {
      "osmosis-1": {
        "cosmoshub-4": "channel-0",
        "1": EUREKA_CHANNEL, // Via Cosmos Hub and Eureka
      },
      "cosmoshub-4": {
        "1": EUREKA_CHANNEL, // Direct to Ethereum via Eureka
        "osmosis-1": "channel-141",
      },
      "neutron-1": {
        "cosmoshub-4": "channel-0",
        "1": EUREKA_CHANNEL, // Via Cosmos Hub and Eureka
      },
      "stride-1": {
        "cosmoshub-4": "channel-5",
        "1": EUREKA_CHANNEL, // Via Cosmos Hub and Eureka
      }
    };

    // Check if we have a predefined channel
    if (eurekaChannels[sourceChainId]?.[destChainId]) {
      return eurekaChannels[sourceChainId][destChainId];
    }

    // Otherwise, fetch from Skip API
    const response = await api<{ operations: any[] }>(
      `${SKIP_BASE_API}/fungible/assets_from_source`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_asset_denom: denom,
          source_asset_chain_id: sourceChainId,
          dest_chain_id: destChainId,
          allow_multi_tx: false,
        }),
      }
    );

    // Extract channel from first operation
    if (response.operations?.[0]?.transfer?.channel) {
      return response.operations[0].transfer.channel;
    }

    return null;
  } catch (error) {
    console.error('Error fetching channel:', error);
    return null;
  }
};