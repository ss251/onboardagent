import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export const CodeBlock = ({ language, value }: { language: string, value: string }) => {
  return (
    <SyntaxHighlighter language={language} style={vscDarkPlus as any}>
      {value}
    </SyntaxHighlighter>
  );
};