import { NextResponse } from 'next/server';

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

export async function POST(request: Request) {
  const body = await request.json();

  const res = await fetch(PINATA_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PINATA_JWT}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to upload to IPFS' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ipfsHash: data.IpfsHash });
}