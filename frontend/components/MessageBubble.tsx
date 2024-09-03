import { Message } from '../types/agent';
import Image from 'next/image';
import JsonDisplay from './JsonDisplay';
import ReactMarkdown from 'react-markdown';
import { CodeBlock } from './CodeBlock';

export const MessageBubble = ({ message }: { message: Message }) => {
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