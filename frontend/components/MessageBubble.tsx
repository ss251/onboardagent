import React from 'react';
import { Message } from '../types/agent';
import Image from 'next/image';
import JsonDisplay from './JsonDisplay';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';

export const MessageBubble = ({ message }: { message: Message | React.ReactElement }) => {
  if (React.isValidElement(message)) {
    return <div className="react-element-wrapper">{message}</div>;
  }

  const typedMessage = message as Message;

  if (React.isValidElement(typedMessage.content)) {
    return <div className="react-element-wrapper">{typedMessage.content}</div>;
  }

  switch (typedMessage.type) {
    case 'image':
      return (
        <div className="flex justify-center">
          <Image src={typedMessage.content as string} alt="Generated image" width={300} height={300} className="rounded-lg" />
        </div>
      );
    case 'json':
      return <JsonDisplay jsonString={String(typedMessage.content)} />;
    default:
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
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" {...props}>
                    {children}
                  </a>
                );
              },
            }}
          >
            {String(typedMessage.content)}
          </ReactMarkdown>
        </div>
      );
  }
}