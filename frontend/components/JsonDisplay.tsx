import React from 'react';
import Link from 'next/link';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface JsonDisplayProps {
  jsonString: string;
}

const JsonDisplay: React.FC<JsonDisplayProps> = ({ jsonString }) => {
  const isSearchResult = (obj: any): obj is SearchResult[] => {
    return Array.isArray(obj) && obj.every(item => 
      item.title && item.link && item.snippet && item.position
    );
  };

  const renderSearchResults = (results: SearchResult[]) => (
    <div className="space-y-4">
      {results.map((result, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-blue-600 mb-2">
            <Link href={result.link} target="_blank" rel="noopener noreferrer">
              {result.title}
            </Link>
          </h3>
          <p className="text-sm text-gray-600 mb-2">{result.snippet}</p>
          <div className="text-xs text-gray-500">{result.link}</div>
        </div>
      ))}
    </div>
  );

  try {
    const parsedJson = JSON.parse(jsonString);
    if (isSearchResult(parsedJson)) {
      return renderSearchResults(parsedJson);
    } else {
      return (
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
          {JSON.stringify(parsedJson, null, 2)}
        </pre>
      );
    }
  } catch {
    return <p className="text-red-500">Invalid JSON</p>;
  }
};

export default JsonDisplay;