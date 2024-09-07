import { Message } from '../types/agent';
import { ethers, Contract, TransactionReceipt } from 'ethers';

export const determineContentType = (content: string): 'text' | 'image' | 'json' => {
  if (content.startsWith('http') && (content.endsWith('.png') || content.endsWith('.jpg') || content.endsWith('.jpeg'))) {
    return 'image';
  } else if (content.startsWith('[{') && content.endsWith('}]')) {
    return 'json';
  } else {
    return 'text';
  }
};

export const determineIntent = (query: string): string => {
  const lowercaseQuery = query.toLowerCase();

  if (lowercaseQuery.startsWith('/cast_to_farcaster')) {
    return "cast_to_farcaster";
  } else if (lowercaseQuery.startsWith('/post_to_lens')) {
    return "post_to_lens";
  } else if (lowercaseQuery.startsWith('/generate_nft')) {
    return "generate_nft";
  } else if (lowercaseQuery.startsWith('/tweet_to_x')) {
    return "tweet_to_x";
  } else {
    return "unknown";
  }
};

export const generateTwitterIntentUrl = (text: string) => {
  const params = new URLSearchParams();
  params.append('text', text);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

export const getAgentRunId = (receipt: TransactionReceipt, contract: Contract): number | null => {
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog && parsedLog.name === "AgentRunCreated") {
        return typeof parsedLog.args.runId === 'number' 
          ? parsedLog.args.runId 
          : parsedLog.args.runId.toNumber ? parsedLog.args.runId.toNumber() 
          : parseInt(parsedLog.args.runId.toString());
      }
    } catch (error) {
      console.error("Error parsing log:", error);
    }
  }
  return null;
};

export const getMintInputId = (receipt: TransactionReceipt, contract: Contract): number | undefined => {
  let mintInputId;
  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);
      if (parsedLog && parsedLog.name === "MintInputCreated") {
        mintInputId = ethers.toNumber(parsedLog.args[1]);
      }
    } catch (error) {
      console.log("Could not parse log:", log);
    }
  }
  return mintInputId;
};

export const generateWarpcastIntentUrl = (explorerUrl: string, description: string) => {
  const text = encodeURIComponent(`Check out my new NFT! ${description}`);
  const embed = encodeURIComponent(explorerUrl);
  return `https://warpcast.com/~/compose?text=${text}&embeds[]=${embed}`;
};

// Add this function to the existing file
export const pollTokenUri = async (contract: Contract, tokenId: number): Promise<{ nftUrl: string, metadata: any } | undefined> => {
  for (let i = 0; i < 120; i++) {
    try {
      const uri = await contract.tokenURI(tokenId);
      if (uri) {
        const base64Data = uri.split(',')[1];
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const metadata = JSON.parse(jsonString);
        return { nftUrl: metadata.image, metadata };
      }
    } catch (e) {
      // Ignore errors and continue polling
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};