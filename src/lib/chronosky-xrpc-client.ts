import { generateDPoPProof, type DPoPKeyPair } from './dpop';

const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://chronopost-api.anon5r.dev';

export interface ChronoskyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface ChronoskyAuthState {
  tokens: ChronoskyTokens | null;
  dpopKeyPair: DPoPKeyPair | null;
  did: string | null;
}

export function getChronoskyAuthState(): ChronoskyAuthState {
  const tokensStr = localStorage.getItem('chronosky_tokens');
  const dpopStr = localStorage.getItem('chronosky_dpop_keypair');
  const did = localStorage.getItem('chronosky_user_did');
  
  return {
    tokens: tokensStr ? JSON.parse(tokensStr) : null,
    dpopKeyPair: dpopStr ? JSON.parse(dpopStr) : null,
    did: did || null,
  };
}

export interface CreateScheduledPostInput {
  text: string;
  scheduledAt: string;
}

export interface ScheduledPost {
  uri: string;
  cid: string;
  scheduledAt: string;
}

export interface CreateScheduledThreadInput {
  posts: { text: string }[];
  scheduledAt: string;
}

export async function createScheduledPost(input: CreateScheduledPostInput): Promise<ScheduledPost> {
  const authState = getChronoskyAuthState();
  
  if (!authState.tokens || !authState.dpopKeyPair) {
    throw new Error('Not authenticated with Chronosky');
  }
  
  const url = new URL(`/xrpc/app.chronosky.schedule.createPost`, CHRONOSKY_API_URL);
  
  // Generate DPoP Proof
  const dpopProof = await generateDPoPProof({
    privateKey: authState.dpopKeyPair.privateKey,
    publicKey: authState.dpopKeyPair.publicKey,
    method: 'POST',
    url: url.toString(),
    accessToken: authState.tokens.accessToken,
  });
  
  // Request
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `DPoP ${authState.tokens.accessToken}`,
      'DPoP': dpopProof,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'XRPC request failed');
  }
  
  return response.json();
}

export async function createScheduledThread(input: CreateScheduledThreadInput): Promise<any> {
  const authState = getChronoskyAuthState();
  
  if (!authState.tokens || !authState.dpopKeyPair) {
    throw new Error('Not authenticated with Chronosky');
  }
  
  const url = new URL(`/xrpc/app.chronosky.schedule.createThread`, CHRONOSKY_API_URL);
  
  const dpopProof = await generateDPoPProof({
    privateKey: authState.dpopKeyPair.privateKey,
    publicKey: authState.dpopKeyPair.publicKey,
    method: 'POST',
    url: url.toString(),
    accessToken: authState.tokens.accessToken,
  });
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Authorization': `DPoP ${authState.tokens.accessToken}`,
      'DPoP': dpopProof,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'XRPC request failed');
  }
  
  return response.json();
}
