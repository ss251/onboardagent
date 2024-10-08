import { ReactNode } from 'react';

export interface Message {
  role: 'assistant' | 'user';
  content: string | ReactNode | NetworkSelectionContent;
  type: string;
}

export interface NetworkSelectionContent {
  type: 'network-selection';
  content: string;
  options: Array<{ id: number; name: string }>;
}

export interface AgentRun {
  id: number;
  owner: string;
  messages: Message[];
  isFinished: boolean;
}

export interface Metadata {
  name: string;
  description: string;
  externalUrl: string;
  attributes: string[];
}

const AVAILABLE_COMMANDS = [
  "/cast_to_farcaster",
  "/post_to_lens",
  "/generate_nft",
  "/tweet_to_x",
  "/view_wallet_info"
] as const;

export type CommandType = typeof AVAILABLE_COMMANDS[number];

export interface Command {
  name: CommandType;
  description: string;
  icon: ReactNode;
}

export interface TokenHolding {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  quote: string | null;
}

export interface ChainPortfolio {
  chainId: number;
  chainName: string;
  nativeBalance: string;
  tokenHoldings: TokenHolding[];
}

export interface WalletInfo {
  address: string;
  portfolios: ChainPortfolio[];
  timestamp: string;
}