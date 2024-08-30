'use client'

import { useState, useEffect } from "react";
import { BrowserProvider, Contract } from "ethers";
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { OnboardAgentABI } from '../abi/OnboardAgent';
import Image from 'next/image';
import JsonDisplay from './JsonDisplay';

interface Message {
  role: string;
  content: string;
  type?: 'text' | 'image' | 'json';
}

interface AgentRun {
  id: number;
  owner: string;
  messages: Message[];
  isFinished: boolean;
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export const AgentTest = () => {
  const { walletProvider } = useWeb3ModalProvider();
  const { address, isConnected } = useWeb3ModalAccount();

  const [contract, setContract] = useState<Contract | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isWaitingResponse, setIsWaitingResponse] = useState<boolean>(false);
  const [agentRun, setAgentRun] = useState<AgentRun | undefined>();
  const [query, setQuery] = useState<string>('');
  const [maxIterations, setMaxIterations] = useState<number>(5);

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
    setIsLoading(false);
    let currentAgentRun: AgentRun = {
      id: newRunId,
      owner: address || "",
      messages: [],
      isFinished: false,
    };
  
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
      currentAgentRun.isFinished = isFinished;
  
      const formattedMessages: Message[] = messages.map((message: any) => ({
        role: message.role,
        content: message.content[0].value,
        type: determineContentType(message.content[0].value),
      }));
  
      currentAgentRun.messages = formattedMessages;
  
      console.log("Message roles:", formattedMessages.map(msg => msg.role));
      setAgentRun(currentAgentRun);
      setIsWaitingResponse(!currentAgentRun.isFinished);
    }
  
    if (!currentAgentRun.isFinished) {
      await new Promise(r => setTimeout(r, 2000));
      await getAgentRun(newRunId);
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
    if (!isConnected) {
      await connectWallet();
      return;
    }
    
    if (!contract) {
      console.error("Contract is not initialized");
      return;
    }
  
    setIsLoading(true);
    try {
      const tx = await contract.runAgent(query, maxIterations);
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      const newRunId = getAgentRunId(receipt);
      console.log("New run ID:", newRunId);
      if (newRunId !== null) {
        setAgentRun({
          id: newRunId,
          owner: address || "",
          messages: [],
          isFinished: false,
        });
        getAgentRun(newRunId);
      } else {
        throw new Error("Failed to get new run ID");
      }
    } catch (error) {
      console.error("Error running agent:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
    } finally {
      setIsLoading(false);
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
    <div className="flex flex-col gap-y-2 w-full pt-10 pb-32 bg-gray-100 text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-blue-600">Agent Test</h1>
      <form onSubmit={handleSubmit} className="mb-6 bg-white p-6 rounded-lg shadow-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your query"
          className="border border-gray-300 p-2 mr-2 rounded w-full mb-4"
        />
        <input
          type="number"
          value={maxIterations}
          onChange={(e) => setMaxIterations(Number(e.target.value))}
          placeholder="Max iterations"
          className="border border-gray-300 p-2 mr-2 rounded w-full mb-4"
        />
        <button 
          type="submit" 
          disabled={isLoading} 
          className={`w-full p-2 rounded ${
            isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : isConnected 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-blue-500 hover:bg-blue-600'
          } text-white font-semibold transition duration-300`}
        >
          {isLoading ? 'Running...' : isConnected ? 'Run Agent' : 'Connect Wallet'}
        </button>
      </form>
      {agentRun && (
        <div className="flex flex-col gap-y-6 pt-6 bg-white p-6 rounded-lg shadow-md">
          {agentRun.messages.slice(1).map((message, index) => (
            <div key={index} className={`p-4 rounded-lg ${
              message.role === 'assistant' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
            }`}>
              <strong className="block mb-2 text-lg">
                {message.role.toUpperCase()}:
              </strong>
              {message.type === 'image' ? (
                <div className="relative w-full h-64">
                  <Image 
                    src={message.content} 
                    alt="Generated image" 
                    layout="fill"
                    objectFit="contain"
                    className="rounded-lg"
                  />
                </div>
              ) : message.type === 'json' ? (
                <JsonDisplay jsonString={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))}
          {isWaitingResponse && (
            <div className="text-center text-yellow-600 font-semibold">
              Waiting for agent&apos;s response...
            </div>
          )}
          {agentRun.isFinished && (
            <div className="text-center text-green-600 font-semibold">
              Agent run completed.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentTest;