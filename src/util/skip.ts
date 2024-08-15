import { api } from "./api";
import { chains } from "chain-registry";
import { SKIP_BASE_API } from "./constants";

type Props = {
    sourceDenom: string;
    sourceChainId: string;
    destChainId: string
}

export const fetchChannelRecommendation = async (
  { sourceChainId, destChainId }
  : Props): Promise<string | null> => {

  // Work backwards from destination chain to find trace channel for fee denom 
  const denom = chains.find((chain) => chain.chain_id === destChainId)?.fees?.fee_tokens[0].denom;
  const requestBody = { 
    requests: [
      {
        source_asset_denom: denom,
        source_asset_chain_id: destChainId,
        dest_chain_id: sourceChainId ,
      },
    ],
  };

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  };

  try {
    const data = await api<{ recommendations: any[]; recommendation_entries: any[] }>(
      `${SKIP_BASE_API}/fungible/recommend_assets`,
      options
    );
    // Extract the recommended channel if it exists
    if (data.recommendation_entries.length > 0 && data.recommendation_entries[0].recommendations.length > 0) {
      const trace = data.recommendation_entries[0].recommendations[0].asset.trace;
      const channel = trace.split('/').pop();
      return channel ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return null;
  }
};
