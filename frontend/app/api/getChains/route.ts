import { NextResponse } from 'next/server';
import { GoldRushClient, Chain } from "@covalenthq/client-sdk";

export async function GET() {
  const client = new GoldRushClient(process.env.COVALENT_API_KEY ?? '');

  try {
    const chainsResp = await client.BaseService.getAllChains();
    const chains = chainsResp.data?.items ?? [];

    const chainOptions = chains.map(chain => ({
      chainId: chain.chain_id as Chain,
      chainName: chain.name
    }));

    return NextResponse.json(chainOptions);
  } catch (error) {
    console.error('Error fetching chains:', error);
    return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 });
  }
}