import { NextResponse } from 'next/server';
import FormData from 'form-data';

const PINATA_API_URL_JSON = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
const PINATA_API_URL_FILE = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

export async function POST(request: Request) {
  const contentType = request.headers.get('Content-Type');

  if (contentType?.includes('application/json')) {
    return handleJsonPinning(request);
  } else if (contentType?.includes('multipart/form-data')) {
    return handleFilePinning(request);
  } else {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
  }
}

async function handleJsonPinning(request: Request) {
  const body = await request.json();

  const res = await fetch(PINATA_API_URL_JSON, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PINATA_JWT}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to upload JSON to IPFS' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ipfsHash: data.IpfsHash });
}

async function handleFilePinning(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const fileData = Buffer.from(buffer);

  const pinataFormData = new FormData();
  pinataFormData.append('file', new Blob([fileData]), file.name);

  const res = await fetch(PINATA_API_URL_FILE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      // Remove this line: ...pinataFormData.getHeaders()
    },
    // Cast the FormData to any to avoid TypeScript errors
    body: pinataFormData as any,
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to upload file to IPFS' }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json({ ipfsHash: data.IpfsHash });
}