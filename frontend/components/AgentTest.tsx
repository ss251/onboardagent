'use client'

import { useState, useEffect, useRef } from "react";
import { BrowserProvider, Contract } from "ethers";
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { OnboardAgentABI } from '../abi/OnboardAgent';
import { Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image';
import JsonDisplay from './JsonDisplay';

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

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

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

export const AgentTest = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();

  const [contract, setContract] = useState<Contract | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);
  const [agentRun, setAgentRun] = useState<AgentRun | undefined>();
  const [query, setQuery] = useState<string>('');
  const [maxIterations, setMaxIterations] = useState<number>(5);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeContract = async () => {
      if (isConnected && walletProvider) {
        const ethersProvider = new BrowserProvider(walletProvider);
        const signer = await ethersProvider.getSigner();
        const newContract = new Contract(CONTRACT_ADDRESS, OnboardAgentABI.abi, signer);
        setContract(newContract);
      }
    };
  
    initializeContract();
  }, [isConnected, walletProvider]);

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

  const getAgentRun = async (newRunId: number) => {
    let contractInstance = contract;
    if (!contractInstance && walletProvider) {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const newContract = new Contract(CONTRACT_ADDRESS, OnboardAgentABI.abi, signer);
      setContract(newContract);
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
    if (!isConnected || !contract || !query.trim()) {
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
      const tx = await contract.runAgent(query, maxIterations);
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
    } catch (error) {
      console.error("Error running agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      setIsWaitingResponse(false);
    }
  };

  const getAgentRunId = (receipt: any): number | null => {
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract?.interface.parseLog(log);
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

  return (
    <div className="flex flex-col h-full">
      <main className="flex-grow overflow-auto p-4 pt-16 bg-background text-foreground transition-colors duration-500">
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
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
              >
                {message.type === 'image' ? (
                  <div className="flex justify-center">
                    <Image src={message.content} alt="Generated image" width={300} height={300} className="rounded-lg" />
                  </div>
                ) : message.type === 'json' ? (
                  <JsonDisplay jsonString={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isWaitingResponse && (
          <div className="flex justify-start mb-4">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-lg rounded-bl-none">
              <PulsatingOrb />
              Generating response
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
          <Button onClick={handleSubmit} disabled={isLoading || isWaitingResponse}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
};