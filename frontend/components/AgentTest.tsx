'use client'

import { useState, useEffect, useRef } from "react";
import { BrowserProvider, Contract } from "ethers";
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { OnboardAgentABI } from '../abi/OnboardAgent';
import { DalleNftABI } from "@/abi/DalleNft";
import { Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CommandMenu } from './CommandMenu';
import { Message, AgentRun, Metadata, NetworkSelectionContent, Command, WalletInfo } from '../types/agent';
import { ONBOARD_AGENT_CONTRACT_ADDRESS, DALLE_NFT_CONTRACT_ADDRESS } from '../constants/contracts';
import { determineContentType, determineIntent, getAgentRunId, getMintInputId, generateWarpcastIntentUrl, generateTwitterIntentUrl, pollTokenUri } from '../utils/agentUtils';
import { PulsatingOrb } from './PulsatingOrb';
import { AnimatedEllipsis } from './AnimatedEllipsis';
import { MessageBubble } from './MessageBubble';
import { MetadataInputs } from './MetadataInputs';
import { useLogin, useCreatePost, useSession, SessionType } from '@lens-protocol/react-web';
import { LensAuth } from './LensAuth';
import { v4 as uuidv4 } from 'uuid';
import { LensPostSummary } from './LensPostSummary';
import { FarcasterLogo, LensLogo, WarpcastLogo, TwitterLogo } from './logos'
import { ChainSelectionModal } from "./ChainSelectionModal";
import { ethers } from "ethers";

interface ContentItem {
  value: string;
}

interface AssistantMessage {
  role: string;
  content: ContentItem[] | string;
}
interface ChainOption {
  chainId: number;
  chainName: string;
}

export const AgentTest = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);

  const [onboardAgentContract, setOnboardAgentContract] = useState<Contract | null>(null);
  const [dalleNftContract, setDalleNftContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [agentRun, setAgentRun] = useState<AgentRun | undefined>();
  const [query, setQuery] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPreparingFarcaster, setIsPreparingFarcaster] = useState(false);
  const [metadata, setMetadata] = useState<Metadata>({
    name: '',
    description: '',
    externalUrl: '',
    attributes: ['']
  });
  const { data: session } = useSession();
  console.log(session)
  const isLensAuthenticated = session?.type === SessionType.WithProfile;
  console.log(isLensAuthenticated)
  const { execute: createPost, error: createPostError, loading: isCreatingPost } = useCreatePost();
  const [inputIntent, setInputIntent] = useState<string | null>(null);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [commandPrefix, setCommandPrefix] = useState('');
  const [chains, setChains] = useState<ChainOption[]>([]);
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const [isChainModalOpen, setIsChainModalOpen] = useState(false);
  const [walletData, setWalletData] = useState<WalletInfo | null>(null);

  useEffect(() => {
    initializeContracts();
  }, [walletProvider]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentRun]);

  const initializeContracts = async () => {
    if (walletProvider) {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();

      const onboardAgent = new Contract(ONBOARD_AGENT_CONTRACT_ADDRESS, OnboardAgentABI.abi, signer);
      setOnboardAgentContract(onboardAgent);

      const dalleNft = new Contract(DALLE_NFT_CONTRACT_ADDRESS, DalleNftABI.abi, signer);
      setDalleNftContract(dalleNft);
    }
  };

  useEffect(() => {
    fetchChains();
  }, []);
  
  const fetchChains = async () => {
    try {
      const response = await fetch('/api/getChains');
      const data = await response.json();
      setChains(data);
    } catch (error) {
      console.error('Error fetching chains:', error);
    }
  };
  
  const handleChainSelection = (newSelectedChains: number[]) => {
    setSelectedChains(newSelectedChains);
  };

  const getAgentRun = async (newRunId: number) => {
    let contractInstance = onboardAgentContract;
    if (!contractInstance && walletProvider) {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const newContract = new Contract(ONBOARD_AGENT_CONTRACT_ADDRESS, OnboardAgentABI.abi, signer);
      setOnboardAgentContract(newContract);
      contractInstance = newContract;
    }
  
    if (contractInstance) {
      const messages = await contractInstance.getMessageHistory(newRunId);
      const isFinished = await contractInstance.isRunFinished(newRunId);
  
      const formattedMessages: Message[] = messages
        .filter((message: any) => message.role !== 'system')
        .map((message: any) => ({
          role: message.role,
          content: message.content[0].value,
          type: determineContentType(message.content[0].value),
        }));
  
      // Filter out duplicate user messages
      const uniqueMessages = formattedMessages.filter((message, index, self) =>
        index === self.findIndex((t) => t.role === message.role && t.content === message.content)
      );
  
      setAgentRun(prev => ({
        ...prev,
        id: newRunId,
        owner: address || "",
        messages: uniqueMessages,
        isFinished: isFinished,
      }));
      setIsWaitingResponse(!isFinished);
  
      console.log("Message roles:", uniqueMessages.map(msg => msg.role));
  
      if (!isFinished) {
        await new Promise(r => setTimeout(r, 2000));
        await getAgentRun(newRunId);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !onboardAgentContract || !query.trim()) {
      return;
    }
  
    const userMessage: Message = { role: 'user', content: query, type: 'text' };
    setAgentRun(prev => ({
      id: prev?.id || 0,
      owner: prev?.owner || address || "",
      messages: [...(prev?.messages || []), userMessage],
      isFinished: false,
    }));
    setQuery('');
    setIsWaitingResponse(true);
  
    try {
      let intent = selectedCommand ? selectedCommand.name.slice(1) : determineIntent(query);

      console.log(intent)
  
      switch (intent) {
        case 'cast_to_farcaster':
          await handleFarcasterIntent(query);
          break;
        case 'generate_nft':
          await handleGenerateNftIntent(query, metadata);
          break;
        case 'post_to_lens':
          await handleLensIntent(query);
          break;
        case 'tweet_to_x':
          await handleTwitterIntent(query);
          break;
        case 'view_wallet_info':
          if (!walletData) {
            setIsChainModalOpen(true);
          } else {
            await handleWalletInfoIntent(walletData, query);
          }
          break;
        default:
          const tx = await onboardAgentContract.handleIntent(intent, query);
          console.log("Transaction sent:", tx.hash);
          const receipt = await tx.wait();
          console.log("Transaction receipt:", receipt);
          const newRunId = getAgentRunId(receipt, onboardAgentContract);
          console.log("New run ID:", newRunId);
          if (newRunId !== null) {
            await getAgentRun(newRunId);
          } else {
            throw new Error("Failed to get new run ID");
          }
      }
    } catch (error) {
      console.error("Error running agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    } finally {
      setIsWaitingResponse(false);
    }
  };

  const handleFarcasterIntent = async (query: string) => {
    if (!isConnected || !onboardAgentContract || !query.trim()) {
      return;
    }
    try {
      console.log("Handling Farcaster intent with query:", query);
      const tx = await onboardAgentContract.handleIntent("cast_to_farcaster", query);
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      const newRunId = getAgentRunId(receipt, onboardAgentContract);
      console.log("New run ID:", newRunId);
      if (newRunId !== null) {
        await waitForAgentRunToFinish(newRunId);
      } else {
        throw new Error("Failed to get new run ID");
      }
    } catch (error) {
      console.error("Error handling Farcaster intent:", error);
    }
  };

  const handleGenerateNftIntent = async (data: string, metadata: Metadata) => {
    if (!walletProvider || !dalleNftContract) {
      console.error("Wallet not connected or contract not initialized");
      return;
    }
  
    try {
      console.log("Initializing mint with data:", data, "and metadata:", metadata);
      const tx = await dalleNftContract.initializeMint(
        data,
        metadata.name,
        metadata.description,
        metadata.externalUrl || '',
        metadata.attributes || []
      );
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
  
      const newTokenId = getMintInputId(receipt, dalleNftContract);
      console.log("New token ID:", newTokenId);
  
      if (newTokenId !== undefined) {
        setIsWaitingResponse(true);
        const tokenData = await pollTokenUri(dalleNftContract, newTokenId);
        if (tokenData) {
          console.log(`Token URI fetched successfully: ${tokenData.nftUrl}`);
          await handleViewNftOnFarcaster(tokenData.nftUrl, tokenData.metadata, newTokenId);
        }
      } else {
        throw new Error("Failed to get new token ID");
      }
    } catch (error) {
      console.error("Error generating NFT:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    } finally {
      setIsWaitingResponse(false);
    }
  };

  const handleLensIntent = async (query: string) => {
    if (!isConnected || !onboardAgentContract || !query.trim()) {
      return;
    }
    if (!isLensAuthenticated) {
      addMessage('assistant', <LensAuth />);
      return;
    }
  
    try {
      const tx = await onboardAgentContract.handleIntent("post_to_lens", query);
      const explorerUrl = `https://explorer.galadriel.com/tx/${tx.hash}`;
      addMessage('assistant', `Transaction sent. [View on Explorer](${explorerUrl})`);
      const receipt = await tx.wait();
      const newRunId = getAgentRunId(receipt, onboardAgentContract);
      if (newRunId !== null) {
        await waitForAgentRunToFinish(newRunId);
        const messages = await onboardAgentContract.getMessageHistory(newRunId);
        const assistantMessages = messages.filter((msg: AssistantMessage) => msg.role === 'assistant');
        
        if (assistantMessages.length > 0) {
          let lensContent = '';
          for (const msg of assistantMessages) {
            const content = Array.isArray(msg.content) 
              ? msg.content.map((item: ContentItem) => item.value).join('\n') 
              : msg.content;
            const match = content.match(/Lens content:\s*([\s\S]*)/i);
            if (match) {
              lensContent = match[1].trim();
              break;
            }
          }
  
          if (lensContent) {
            await postToLens(lensContent);
          } else {
            // If no specific Lens content is found, use all assistant messages
            const fullContent = assistantMessages
              .map((msg: AssistantMessage) => Array.isArray(msg.content) 
                ? msg.content.map((item: ContentItem) => item.value).join('\n') 
                : msg.content)
              .join('\n')
              .replace(/Lens content:\s*/gi, ''); // Remove any "Lens content:" prefixes
            await postToLens(fullContent);
          }
        } else {
          addMessage('assistant', 'Error: No content generated for Lens post.');
        }
      } else {
        throw new Error("Failed to get new run ID");
      }
    } catch (error: unknown) {
      console.error("Error handling Lens intent:", error);
      addMessage('assistant', `Error handling Lens intent. Please try again.`);
    }
  };

  const postToLens = async (content: string) => {
    if (!session?.authenticated) {
      console.error('Not authenticated with Lens');
      addMessage('assistant', 'Error: Not authenticated with Lens. Please log in and try again.');
      return;
    }

    try {
      const metadata = {
        $schema: "https://json-schemas.lens.dev/publications/text-only/3.0.0.json",
        lens: {
          appId: "OnboardAgent",
          content: content,
          id: uuidv4(),
          locale: "en",
          mainContentFocus: "TEXT_ONLY",
          name: "Post from OnboardAgent",
          tags: ["OnboardAgent"],
          version: "3.0.0"
        },
        description: content,
      };

      // Pin to IPFS only once
      const response = await fetch('/api/pinata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        throw new Error('Failed to upload content to IPFS');
      }

      const { ipfsHash } = await response.json();
      const ipfsUri = `ipfs://${ipfsHash}`;

      // Add a delay to allow for IPFS propagation
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay

      addMessage('assistant', 'Posting to Lens...');

      // Retry logic
      const maxRetries = 5;
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await createPost({
            metadata: ipfsUri,
          });

          if (result.isFailure()) {
            throw new Error(result.error.message);
          }

          const post = await result.value.waitForCompletion();
          console.log("Post created:", post);
          addMessage('assistant', <LensPostSummary post={post} />);
          return; // Success, exit the function
        } catch (error: any) {
          console.error(`Attempt ${i + 1} failed:`, error);
          if (i === maxRetries - 1) {
            // If this was the last attempt, throw the error
            throw error;
          }
          // Wait before next retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error: any) {
      console.error('Error posting to Lens:', error);
      addMessage('assistant', `Failed to post to Lens. Please try again later.`);
    }
  };

  // Helper function to add messages to the chat
  const addMessage = (role: 'assistant' | 'user', content: string | React.ReactNode | NetworkSelectionContent) => {
    setAgentRun(prev => {
      if (!prev) return undefined;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          { role, content, type: 'text' }
        ],
      };
    });
  };

  const handleViewNftOnFarcaster = async (nftUrl: string, metadata: { description: string }, tokenId: number) => {
    const explorerUrl = `https://explorer.galadriel.com/token/0xbf14632090839dc42E647273B71A4FD767B5DbBa/instance/${tokenId}`;
    const warpcastUrl = generateWarpcastIntentUrl(explorerUrl, metadata.description);
    setAgentRun(prev => {
      if (!prev) return undefined;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          { 
            role: 'assistant', 
            content: (
              <span>
                View on Warpcast <WarpcastLogo className="inline w-4 h-4" />: <a href={warpcastUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center">Click here</a>
              </span>
            ), 
            type: 'text' 
          }
        ],
      };
    });
  };

  const waitForAgentRunToFinish = async (runId: number, isWalletInfoIntent = false) => {
    if (!isConnected || !onboardAgentContract) {
      return;
    }
    let isFinished = false;
    let messages: Message[] = [];
  
    while (!isFinished) {
      const agentMessages = await onboardAgentContract.getMessageHistory(runId);
      messages = agentMessages
        .filter((msg: any) => msg.role !== 'system')
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content[0].value,
          type: determineContentType(msg.content[0].value),
        }));
      isFinished = await onboardAgentContract.isRunFinished(runId);
      if (!isFinished) {
        console.log("Waiting for agent run to finish...");
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  
    console.log("Generated messages:", messages);
    
    if (isWalletInfoIntent) {
      // For wallet info intent, only add the assistant's response
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');
      setAgentRun(prev => {
        if (!prev) return undefined;
        return {
          ...prev,
          messages: [...prev.messages, ...assistantMessages],
        };
      });
    } else {
      // For other intents, add all messages except the user's initial query
      setAgentRun(prev => {
        if (!prev) return undefined;
        const newMessages = messages.filter(msg => msg.role !== 'user');
        return {
          ...prev,
          messages: [...prev.messages, ...newMessages],
        };
      });
    }
  
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      const lastMessage = messages[messages.length - 1];
      if (selectedCommand?.name.slice(1) === 'cast_to_farcaster' || determineIntent(query) === 'cast_to_farcaster') {
        await prepareFarcasterContent(messages);
      } else if (selectedCommand?.name.slice(1) === 'tweet_to_x' || determineIntent(query) === 'tweet_to_x') {
        await prepareTwitterContent(messages);
      }
    }
  
    setIsWaitingResponse(false);
  };

  const prepareFarcasterContent = async (messages: Message[]) => {
    try {
      setIsPreparingFarcaster(true);
      console.log("Preparing Farcaster content:", messages);
  
      let textContent = '';
      let imageUrl = null;
  
      for (const message of messages) {
        if (message.type === 'text' && message.role === 'assistant' && typeof message.content === 'string') {
          // Check for specific Farcaster content first
          const farcasterMatch = message.content.match(/Farcaster content:\s*([\s\S]*)/i);
          if (farcasterMatch) {
            textContent = farcasterMatch[1].trim();
            break;
          } else {
            // If no specific Farcaster content, append the message content
            textContent += (textContent ? '\n' : '') + message.content.trim();
          }
        } else if (message.type === 'image' && message.role === 'assistant') {
          imageUrl = message.content;
        }
      }
  
      // Trim and limit the content to Farcaster's character limit (e.g., 320 characters)
      textContent = textContent.trim().slice(0, 320);
  
      console.log("Extracted text content:", textContent);
      console.log("Extracted image URL:", imageUrl);
  
      if (!textContent) {
        throw new Error("No content extracted for Farcaster cast");
      }
  
      const response = await fetch('/api/castToFarcaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: textContent, imageUrl }),
      });
      const data = await response.json();
      console.log("Farcaster response:", data);
      if (data.success && data.url) {
        setAgentRun(prev => {
          if (!prev) return undefined;
          return {
            ...prev,
            messages: [
              ...prev.messages,
              { role: 'assistant', content: `Click [here](${data.url}) to cast to Farcaster`, type: 'text' }
            ],
          };
        });
      } else {
        throw new Error("Failed to generate Farcaster cast URL");
      }
    } catch (error) {
      console.error("Error preparing Farcaster content:", error);
      setAgentRun(prev => {
        if (!prev) return undefined;
        return {
          ...prev,
          messages: [
            ...prev.messages,
            { role: 'assistant', content: 'Error preparing Farcaster content. Please try again.', type: 'text' }
          ],
        };
      });
    } finally {
      setIsPreparingFarcaster(false);
      setIsWaitingResponse(false);
    }
  };

  const prepareTwitterContent = async (messages: Message[]) => {
    try {
      let tweetContent = '';
      for (const message of messages.reverse()) {
        if (message.role === 'assistant' && typeof message.content === 'string') {
          const match = message.content.match(/Tweet content:\s*([\s\S]*)/);
          if (match) {
            tweetContent = match[1].trim();
            // Remove quotes at the beginning and end if they exist
            tweetContent = tweetContent.replace(/^["']|["']$/g, '');
            break;
          }
        }
      }
  
      if (!tweetContent) {
        console.error("No tweet content found in messages");
        addMessage('assistant', 'Error preparing Twitter content. Please try again.');
        return;
      }
  
      const twitterUrl = generateTwitterIntentUrl(tweetContent);
      addMessage('assistant', (
        <span>
          Tweet on Twitter <TwitterLogo className="inline w-4 h-4" />: <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center">Click here</a>
        </span>
      ));
    } catch (error) {
      console.error("Error preparing Twitter content:", error);
      addMessage('assistant', 'Error preparing Twitter content. Please try again.');
    }
  };

  const handleTwitterIntent = async (query: string) => {
    if (!isConnected || !onboardAgentContract || !query.trim()) {
      return;
    }
    try {
      console.log("Handling Twitter intent with query:", query);
      const tx = await onboardAgentContract.handleIntent("tweet_to_x", query);
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      const newRunId = getAgentRunId(receipt, onboardAgentContract);
      console.log("New run ID:", newRunId);
      if (newRunId !== null) {
        await waitForAgentRunToFinish(newRunId);
      } else {
        throw new Error("Failed to get new run ID");
      }
    } catch (error) {
      console.error("Error handling Twitter intent:", error);
    }
  };
  
  const renderIntentLogo = () => {
    switch (inputIntent) {
      case 'cast_to_farcaster':
        return <FarcasterLogo className="w-5 h-5" />;
      case 'post_to_lens':
        return <LensLogo className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'attributes') {
      setMetadata({ ...metadata, [name]: value.split(',') });
    } else {
      setMetadata({ ...metadata, [name]: value });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.startsWith('/')) {
      setIsCommandMenuOpen(true);
      setCommandPrefix('');
    } else if (selectedCommand) {
      setIsCommandMenuOpen(false);
      if (!value.startsWith(selectedCommand.name)) {
        setCommandPrefix(selectedCommand.name + ' ');
      }
    } else {
      setIsCommandMenuOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && selectedCommand) {
      if (query === '') {
        e.preventDefault();
        setQuery('');
        setSelectedCommand(null);
        setIsCommandMenuOpen(true);
      }
    }
  };

  const handleCommandSelect = (command: Command) => {
    setSelectedCommand(command);
    setCommandPrefix(command.name + ' ');
    setQuery('');
    setIsCommandMenuOpen(false);
  
    if (command.name === '/view_wallet_info') {
      setIsChainModalOpen(true);
    }
  };

  const handleViewWalletInfo = async (chains: number[]) => {
    if (!address) {
      console.error('No wallet address available');
      return;
    }
  
    setIsLoading(true);
    setIsChainModalOpen(false);
  
    const chainParams = chains.filter(Boolean).join(',');
    const url = `/api/fetchWalletInfo?address=${encodeURIComponent(address)}&chains=${encodeURIComponent(chainParams)}`;
  
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Display the wallet info in the chat
      setAgentRun(prev => ({
        id: prev?.id || 0,
        owner: prev?.owner || address || "",
        messages: [
          ...(prev?.messages || []),
          {
            role: 'assistant',
            content: JSON.stringify(data, null, 2),
            type: 'json'
          }
        ],
        isFinished: true
      }));
      
      // Set the wallet data in state for later use
      setWalletData(data);
      
      // Prompt the user to ask for insights
      addMessage('assistant', 'I have fetched your wallet information. What insights would you like to know about your wallet?');
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      addMessage('assistant', 'Failed to fetch wallet information. Please try again.');
    }
    setIsLoading(false);
  };

  const handleWalletInfoIntent = async (walletData: WalletInfo, userQuery: string) => {
    if (!onboardAgentContract) {
      console.error('Onboard Agent contract not initialized');
      return;
    }
  
    const intent = "view_wallet_info";
    const systemPromptInfo = `You are an AI assistant specialized in analyzing wallet information. The user will provide wallet data in JSON format and a specific question about their wallet. Your task is to interpret this data and provide insights about the wallet's contents, balances, and transactions across different chains, focusing on answering the user's question. Here's how to interpret the data:
  
    - address: The Ethereum address of the wallet
    - portfolios: An array of chain portfolios
      - chainId: The chain ID as defined by Covalent API
      - chainName: The human-readable name of the chain
      - nativeBalance: The balance of the native currency in its smallest unit (e.g., wei for ETH)
      - tokenHoldings: An array of token holdings on this chain
        - address: The contract address of the token
        - name: The name of the token
        - symbol: The symbol of the token (e.g., 'ETH', 'USDC')
        - balance: The balance of the token in its smallest unit (e.g., wei for ETH, 6 decimal places for USDC)
        - quote: The USD value of the token balance (null if unavailable)
    - timestamp: When the data was fetched
  
    Provide a clear and concise answer to the user's question based on this data.`;
  
    const userPrompt = `${systemPromptInfo}\n\nWallet data:\n${JSON.stringify(walletData, null, 2)}\n\nUser's question: ${userQuery}`;
  
    try {
      setIsWaitingResponse(true);
      const intentBytes32 = ethers.encodeBytes32String(intent);
      const maxTokens = 5;
  
      console.log('Calling runAgent with:', { intentBytes32, userPrompt, maxTokens });
      const tx = await onboardAgentContract.runAgent(intentBytes32, userPrompt, maxTokens);
      console.log('runAgent transaction:', tx);
  
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
  
      const runId = getAgentRunId(receipt, onboardAgentContract);
      console.log('Extracted runId:', runId);
  
      if (runId === null) {
        throw new Error('Failed to extract runId from transaction receipt');
      }
  
      // Wait for the agent run to finish
      await waitForAgentRunToFinish(runId, true); // Pass true to indicate this is a wallet info intent
  
    } catch (error) {
      console.error("Error handling wallet info intent:", error);
      addMessage('assistant', 'Error analyzing wallet information. Please try again.');
    } finally {
      setIsWaitingResponse(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <main className="flex-grow overflow-auto p-4 pt-12 bg-background text-foreground transition-colors duration-500">
      
        
      <AnimatePresence>
        {agentRun?.messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className={`mb-4 ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
          >
            <div className={`message-bubble ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}>
              <MessageBubble message={message} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {(selectedCommand?.name.slice(1) === 'post_to_lens' || determineIntent(query) === 'post_to_lens') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="flex justify-start mb-4"
        >
          <div className="message-bubble assistant-message">
            <MessageBubble message={<LensAuth />} />
          </div>
        </motion.div>
      )}
      {isWaitingResponse && !isPreparingFarcaster && (
        <div className="flex justify-start mb-4">
          <div className="bg-secondary text-secondary-foreground p-3 rounded-lg rounded-bl-none">
            <PulsatingOrb />
            Generating response
            <AnimatedEllipsis />
          </div>
        </div>
        )}
        {isPreparingFarcaster && (
          <div className="flex justify-start mb-4">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-lg rounded-bl-none">
              <PulsatingOrb />
              Preparing Farcaster content
              <AnimatedEllipsis />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </main>
      <footer className="p-4 bg-background">
        <div className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <div className="relative flex items-center w-full">
              {selectedCommand && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center bg-gray-100 dark:bg-gray-700 rounded-l-md px-3 border-r border-gray-300 dark:border-gray-600 z-10">
                  <span className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedCommand.icon}
                    <span>{selectedCommand.name}</span>
                  </span>
                </div>
              )}
            <Input
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onKeyPress={handleKeyPress}
              placeholder={selectedCommand ? "Enter your prompt..." : "Enter your prompt or type / to use a command..."}
              className={`flex-grow ${
                selectedCommand 
                  ? `pl-[${selectedCommand.name.length * 8 + 48}px]` 
                  : ''
              }`}
              style={{
                paddingLeft: selectedCommand ? `${selectedCommand.name.length * 8 + 48}px` : '',
              }}
            />
            </div>
            <CommandMenu
              isOpen={isCommandMenuOpen && query.startsWith('/')}
              onSelect={handleCommandSelect}
              onClose={() => setIsCommandMenuOpen(false)}
              inputValue={query}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading || isWaitingResponse}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
        {selectedCommand && selectedCommand.name === '/generate_nft' && !isWaitingResponse && (
          <MetadataInputs metadata={metadata} handleMetadataChange={handleMetadataChange} />
        )}
      </footer>
      <ChainSelectionModal
        isOpen={isChainModalOpen}
        onClose={() => setIsChainModalOpen(false)}
        chains={chains}
        selectedChains={selectedChains}
        onChainSelect={setSelectedChains}
        onSave={(selectedChains) => {
          setSelectedChains(selectedChains);
          handleViewWalletInfo(selectedChains);
        }}
      />
    </div>
  );
};