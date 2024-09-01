import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { content, imageUrl } = await req.json();
    console.log("Farcaster content:", content);
    console.log("Image URL:", imageUrl);

    let castComposerUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(content)}`;
    
    if (imageUrl) {
      castComposerUrl += `&embeds[]=${encodeURIComponent(imageUrl)}`;
    }

    return NextResponse.json({ success: true, message: "Content ready for Farcaster!", url: castComposerUrl });
  } catch (error) {
    console.error("Error in Farcaster API:", error);
    return NextResponse.json({ success: false, message: "Failed to prepare content for Farcaster." }, { status: 500 });
  }
}   