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
import Image from 'next/image';
import JsonDisplay from './JsonDisplay';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ethers, TransactionReceipt } from 'ethers';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'json';
  isLoading?: boolean;
}

interface AgentRun {
  id: number;
  owner: string;
  messages: Message[];
  isFinished: boolean;
}

const ONBOARD_AGENT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ONBOARD_AGENT_CONTRACT_ADDRESS || '';
const DALLE_NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DALLE_NFT_CONTRACT_ADDRESS || '';

const PulsatingOrb = () => (
  <motion.div
    className="w-3 h-3 bg-primary rounded-full inline-block mr-2"
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
)

const AnimatedEllipsis = () => (
  <motion.span
    className="inline-block w-4 text-primary"
    animate={{ opacity: [0, 1, 0] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
  >
    ...
  </motion.span>
)

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  return (
    <SyntaxHighlighter language={language} style={vscDarkPlus as any}>
      {value}
    </SyntaxHighlighter>
  );
};

export const AgentTest = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();

  const [onboardAgentContract, setOnboardAgentContract] = useState<Contract | null>(null);
  const [dalleNftContract, setDalleNftContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);
  const [agentRun, setAgentRun] = useState<AgentRun | undefined>();
  const [query, setQuery] = useState<string>('');
  const [maxIterations, setMaxIterations] = useState<number>(5);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isPreparingFarcaster, setIsPreparingFarcaster] = useState(false);
  const [metadata, setMetadata] = useState({
    name: '',
    description: '',
    externalUrl: '',
    attributes: ['']
  });

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
    initializeContracts();
  }, [walletProvider]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentRun]);

  const connectWallet = async () => {
    if (walletProvider) {
      try {
        await walletProvider.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      }
    }
  };

  const renderMessage = (message: Message) => {
    if (message.type === 'image') {
      return (
        <div className="flex justify-center">
          <Image src={message.content} alt="Generated image" width={300} height={300} className="rounded-lg" />
        </div>
      );
    } else if (message.type === 'json') {
      return <JsonDisplay jsonString={message.content} />;
    } else {
      return (
        <div className="markdown-content">
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                const isInline = !match && children && typeof children === 'string' && !children.includes('\n');
                
                return isInline ? (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                ) : (
                  <div className="code-block-wrapper">
                    <CodeBlock
                      language={language}
                      value={String(children).replace(/\n$/, '')}
                    />
                  </div>
                );
              },
              a({ href, children, ...props }) {
                return (
                  <a href={href} target="_blank" className="text-blue-500 underline" {...props}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
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
  
  const determineContentType = (content: string): 'text' | 'image' | 'json' => {
    if (content.startsWith('http') && (content.endsWith('.png') || content.endsWith('.jpg') || content.endsWith('.jpeg'))) {
      return 'image';
    } else if (content.startsWith('[{') && content.endsWith('}]')) {
      return 'json';
    } else {
      return 'text';
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
        const newRunId = getAgentRunId(receipt);
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

  const determineIntent = (query: string): string => {
    if (query.includes("display wallet info")) {
      return "display_wallet_info";
    } else if (query.includes("token swap")) {
      return "token_swap";
    } else if (query.includes("bridge tokens")) {
      return "bridge_tokens";
    } else if (query.includes("send tokens")) {
      return "send_tokens";
    } else if (query.includes("cast to farcaster")) {
      return "cast_to_farcaster";
    } else if (query.includes("generate nft")) {
      return "generate_nft";
    } else {
      return "unknown";
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
      const newRunId = getAgentRunId(receipt);
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

  const handleGenerateNftIntent = async (data: string, metadata: {
    name: string
    description: string
    externalUrl: string
    attributes: string[]
  }) => {
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

  const getMintInputId = (receipt: TransactionReceipt, contract: Contract): number | undefined => {
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

  const pollTokenUri = async (contract: Contract, tokenId: number): Promise<{ nftUrl: string, metadata: any } | undefined> => {
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
  
  const generateWarpcastIntentUrl = (explorerUrl: string, description: string) => {
    const text = encodeURIComponent(`Check out my new NFT! ${description}`);
    const embed = encodeURIComponent(explorerUrl);
    return `https://warpcast.com/~/compose?text=${text}&embeds[]=${embed}`;
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

  const getAgentRunId = (receipt: any): number | null => {
    for (const log of receipt.logs) {
      try {
        const parsedLog = onboardAgentContract?.interface.parseLog(log);
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
              {renderMessage(message)}
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
            <>
              <Input
                name="name"
                value={metadata.name}
                onChange={handleMetadataChange}
                placeholder="Enter NFT name"
              />
              <Input
                name="description"
                value={metadata.description}
                onChange={handleMetadataChange}
                placeholder="Enter NFT description"
              />
              <Input
                name="externalUrl"
                value={metadata.externalUrl}
                onChange={handleMetadataChange}
                placeholder="Enter external URL"
              />
              <Input
                name="attributes"
                value={metadata.attributes.join(',')}
                onChange={handleMetadataChange}
                placeholder="Enter attributes (comma-separated)"
              />
            </>
          )}
          <Button onClick={handleSubmit} disabled={isLoading || isWaitingResponse}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
};