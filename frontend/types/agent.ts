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