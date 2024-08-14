import { api } from "./api";

type Props = {
    sourceDenom: string;
    sourceChainId: string;
    destChainId: string
}

const SKIP_BASE_API = 'https://api.skip.build/v2';

export const fetchChannelRecommendation = async (
  { sourceDenom, sourceChainId, destChainId }
  : Props): Promise<string | null> => {
  const requestBody = {
    requests: [
      {
        source_asset_denom: sourceDenom,
        source_asset_chain_id: sourceChainId,
        dest_chain_id: destChainId,
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
      const channel = trace.split('/').pop(); // Extract channel from trace (e.g., "channel-141")
      return channel ?? null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return null;
  }
};
