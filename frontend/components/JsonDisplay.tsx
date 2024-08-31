import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface SearchResult {
  title: string;
  link: string;
  snippet?: string;
  sitelinks?: { title: string; link: string }[];
  position: number;
}

interface JsonDisplayProps {
  jsonString: string;
}

const SearchResultItem: React.FC<SearchResult> = ({ title, link, snippet, sitelinks }) => (
  <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
    <h3 className="text-lg font-semibold mb-2">
      <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
        {title}
      </a>
    </h3>
    {snippet && <p className="text-sm mb-2">{snippet}</p>}
    {sitelinks && sitelinks.length > 0 && (
      <div className="mt-2">
        <p className="text-sm font-semibold mb-1">Related links:</p>
        <ul className="list-disc list-inside">
          {sitelinks.map((sitelink, index) => (
            <li key={index} className="text-sm">
              <a href={sitelink.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                {sitelink.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

const JsonDisplay: React.FC<JsonDisplayProps> = ({ jsonString }) => {
  const formatJson = (json: string): string => {
    try {
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return json; // Return original string if parsing fails
    }
  };

  const renderSearchResults = (results: SearchResult[]) => (
    <div className="space-y-4">
      {results.map((result, index) => (
        <SearchResultItem key={index} {...result} />
      ))}
    </div>
  );

  try {
    const parsedJson = JSON.parse(jsonString);
    if (Array.isArray(parsedJson) && parsedJson.length > 0 && 'title' in parsedJson[0] && 'link' in parsedJson[0]) {
      return renderSearchResults(parsedJson as SearchResult[]);
    }
  } catch (error) {
    console.error("Failed to parse JSON:", error);
  }

  // Default to raw JSON display if not search results or parsing fails
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
      >
        {formatJson(jsonString)}
      </SyntaxHighlighter>
    </div>
  );
};

export default JsonDisplay;