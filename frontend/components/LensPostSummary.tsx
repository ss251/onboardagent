import React from 'react';

interface LensPostSummaryProps {
  post: any; // You might want to create a proper type for this
}

export const LensPostSummary: React.FC<LensPostSummaryProps> = ({ post }) => {
  console.log("LensPostSummary received post:", post);

  if (!post) {
    console.error("Post object is undefined");
    return <div className="text-red-500">Error: Post data is missing</div>;
  }

  const postUrl = `https://hey.xyz/posts/${post.value.id}`;

  return (
    <div className="bg-background p-4 rounded-lg shadow-md border border-border">
      <h3 className="text-lg font-semibold mb-2 text-foreground">Successfully Posted to Lens!</h3>
      <p className="mb-2 text-foreground"><strong className="text-primary">Post ID:</strong> {post.value.id}</p>
      <p className="mb-2 text-foreground"><strong className="text-primary">Created at:</strong> {new Date(post.value.createdAt).toLocaleString()}</p>
      <p className="mb-2 text-foreground"><strong className="text-primary">Content:</strong> {post.value.metadata?.content?.substring(0, 100)}...</p>
      <p className="mb-2 text-foreground">
        <strong className="text-primary">Hashtags:</strong> {post.value.hashtagsMentioned?.map((tag: string) => `#${tag}`).join(', ')}
      </p>
      <p className="mb-2">
        <strong className="text-primary">View post:</strong> <a href={postUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Click here</a>
      </p>
      <div className="mt-4">
      </div>
    </div>
  );
};