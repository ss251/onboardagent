export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image' | 'json';
  isLoading?: boolean;
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