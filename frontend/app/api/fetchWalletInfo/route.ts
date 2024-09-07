import { NextRequest, NextResponse } from 'next/server';
import { GoldRushClient, Chain } from "@covalenthq/client-sdk";

interface TokenHolding {
  /** The contract address of the token */
  address: string;
  /** The name of the token */
  name: string;
  /** The symbol of the token (e.g., "ETH", "USDC") */
  symbol: string;
  /** The balance of the token in its smallest unit (e.g., wei for ETH, 6 decimal places for USDC) */
  balance: string;
  /** The USD value of the token balance, as a string to preserve precision. Null if unavailable */
  quote: string | null;
}

interface ChainPortfolio {
  /** The chain ID as defined by Covalent API */
  chainId: Chain;
  /** The human-readable name of the chain */
  chainName: string;
  /** The balance of the native currency in its smallest unit (e.g., wei for ETH) */
  nativeBalance: string;
  /** Array of token holdings on this chain */
  tokenHoldings: TokenHolding[];
}

interface WalletInfo {
  /** The Ethereum address of the wallet */
  address: string;
  /** Array of portfolio data for each chain */
  portfolios: ChainPortfolio[];
  /** Timestamp of when the data was fetched, in ISO 8601 format */
  timestamp: string;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');
  const selectedChains = req.nextUrl.searchParams.get('chains')?.split(',').filter(Boolean) || [];

  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }

  const client = new GoldRushClient(process.env.COVALENT_API_KEY ?? '');

  try {
    const chainsResp = await client.BaseService.getAllChains();
    const chains = chainsResp.data?.items ?? [];

    const portfolios: ChainPortfolio[] = [];

    for (const chain of chains) {
        if (chain.chain_id && (selectedChains.length === 0 || selectedChains.includes(chain.chain_id.toString()))) {
        try {
          const balanceResp = await client.BalanceService.getTokenBalancesForWalletAddress(chain.chain_id as Chain, address);
          
          const nativeBalance = balanceResp.data?.items?.find(item => item.native_token)?.balance?.toString() ?? '0';
          const tokenHoldings: TokenHolding[] = [];

          balanceResp.data?.items?.forEach(item => {
            if (item.balance && BigInt(item.balance) > BigInt(0)) {
              tokenHoldings.push({
                address: item.contract_address ?? '',
                name: item.contract_name ?? '',
                symbol: item.contract_ticker_symbol ?? '',
                balance: item.balance.toString(),
                quote: item.quote ? item.quote.toString() : null
              });
            }
          });

          if (BigInt(nativeBalance) > BigInt(0) || tokenHoldings.length > 0) {
            portfolios.push({
              chainId: chain.chain_id as Chain,
              chainName: chain.name ?? '',
              nativeBalance,
              tokenHoldings
            });
          }
        } catch (chainError) {
          console.error(`Error fetching data for chain ${chain.chain_id}:`, chainError);
        }
      }
    }

    const response: WalletInfo = bigIntToString({
      address,
      portfolios,
      timestamp: new Date().toISOString()
    });
    
    console.log('API Response:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet info' }, { status: 500 });
  }
}

function bigIntToString(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (typeof obj === 'number') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString);
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, bigIntToString(value)])
    );
  }
  return obj;
}