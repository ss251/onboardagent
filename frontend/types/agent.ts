import { ReactNode } from 'react';

export interface Message {
  role: 'assistant' | 'user';
  content: string | ReactNode;
  type: string;
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