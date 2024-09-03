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
import { Message, AgentRun, Metadata } from '../types/agent';
import { ONBOARD_AGENT_CONTRACT_ADDRESS, DALLE_NFT_CONTRACT_ADDRESS } from '../constants/contracts';
import { determineContentType, determineIntent, getAgentRunId, getMintInputId, generateWarpcastIntentUrl, pollTokenUri } from '../utils/agentUtils';
import { PulsatingOrb } from './PulsatingOrb';
import { AnimatedEllipsis } from './AnimatedEllipsis';
import { MessageBubble } from './MessageBubble';
import { MetadataInputs } from './MetadataInputs';

export const AgentTest = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();

  const [onboardAgentContract, setOnboardAgentContract] = useState<Contract | null>(null);
  const [dalleNftContract, setDalleNftContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);
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

  const connectWallet = async () => {
    if (walletProvider) {
      try {
        await walletProvider.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
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
      const intent = determineIntent(query);
      if (intent === 'cast_to_farcaster') {
        await handleFarcasterIntent(query);
      } else if (intent === 'generate_nft') {
        await handleGenerateNftIntent(query, metadata);
      } else {
        const tx = await onboardAgentContract.handleIntent(intent, query);
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("Transaction receipt:", receipt);
        const newRunId = getAgentRunId(receipt, onboardAgentContract);
        console.log("New run ID:", newRunId);
        if (newRunId !== null) {
          getAgentRun(newRunId);
        } else {
          throw new Error("Failed to get new run ID");
        }
      }
    } catch (error) {
      console.error("Error running agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
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

  const handleViewNftOnFarcaster = async (nftUrl: string, metadata: { description: string }, tokenId: number) => {
    const explorerUrl = `https://explorer.galadriel.com/token/0xbf14632090839dc42E647273B71A4FD767B5DbBa/instance/${tokenId}`;
    const warpcastUrl = generateWarpcastIntentUrl(explorerUrl, metadata.description);
    setAgentRun(prev => {
      if (!prev) return undefined;
      return {
        ...prev,
        messages: [
          ...prev.messages,
          { role: 'assistant', content: `Click [here](${warpcastUrl}) to view the NFT on Farcaster`, type: 'text' }
        ],
      };
    });
  };

  const waitForAgentRunToFinish = async (runId: number) => {
    if (!isConnected || !onboardAgentContract || !query.trim()) {
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
    setAgentRun(prev => {
      if (!prev) return undefined;
      // Filter out the user message as it's already displayed
      const newMessages = messages.filter(msg => msg.role !== 'user');
      return {
        ...prev,
        messages: [...prev.messages, ...newMessages],
      };
    });
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      await prepareFarcasterContent(messages);
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
        if (message.type === 'text' && message.role === 'assistant' && message.content.startsWith('Farcaster content:')) {
          textContent = message.content.replace('Farcaster content:', '').trim();
        } else if (message.type === 'image' && message.role === 'assistant') {
          imageUrl = message.content;
        }
      }
  
      console.log("Extracted text content:", textContent);
      console.log("Extracted image URL:", imageUrl);
  
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
      }
    } catch (error) {
      console.error("Error preparing Farcaster content:", error);
    } finally {
      setIsPreparingFarcaster(false);
      setIsWaitingResponse(false);
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

  return (
    <div className="flex flex-col h-full">
      <main className="flex-grow overflow-auto p-4 pt-20 bg-background text-foreground transition-colors duration-500">
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
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your message..."
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
            className="flex-grow"
          />
          {determineIntent(query) === 'generate_nft' && (
            <MetadataInputs metadata={metadata} handleMetadataChange={handleMetadataChange} />
          )}
          <Button onClick={handleSubmit} disabled={isLoading || isWaitingResponse}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
};