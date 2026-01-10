import { generateDPoPKeyPair } from './dpop';

// Constants from AGENTS.md
const CHRONOSKY_API_URL = import.meta.env.VITE_CHRONOSKY_API_URL || 'https://chronopost-api.anon5r.dev';
const CHRONOSKY_CLIENT_ID = `${CHRONOSKY_API_URL}/client-metadata.json`;
const CHRONOSKY_PROXY_CALLBACK = `${CHRONOSKY_API_URL}/oauth/proxy/callback`;

// Use dynamic origin for redirect URI to support preview deployments
const CHRONOSKY_REDIRECT_URI = `${window.location.origin}/oauth/chronosky/callback`;

export async function resolveHandle(handle: string) {
  const res = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`);
  if (!res.ok) throw new Error('Failed to resolve handle');
  const data = await res.json();
  
  // Now resolve PDS
  // Note: For simplicity, we are just querying the handle resolution. 
  // To get PDS, we usually look up the DID doc.
  // Let's use a simpler approach or a public API helper if available, or just fetch the DID doc.
  // The guide snippet assumes `resolveHandle` returns { did, pdsUrl }.
  // We need to implement that manually if not using a library helper for it.
  
  const did = data.did;
  
  // Fetch DID Doc
  // Resolving PLC or web did. For now assuming bsky.social handles mostly.
  // Let's use the standard `https://plc.directory/{did}` for did:plc
  
  let pdsUrl = 'https://bsky.social'; // Default fallback
  
  try {
    if (did.startsWith('did:plc:')) {
      const plcRes = await fetch(`https://plc.directory/${did}`);
      const plcData = await plcRes.json();
      const service = plcData.service?.find((s: any) => s.type === 'AtprotoPersonalDataServer');
      if (service) pdsUrl = service.serviceEndpoint;
    }
  } catch (e) {
    console.warn('Failed to resolve PDS from DID doc, using fallback', e);
  }

  return { did, pdsUrl };
}

async function getOAuthMetadata(pdsUrl: string) {
  const baseUrl = pdsUrl.replace(/\/$/, '');
  
  let issuer = baseUrl;
  
  // 1. Try to find the authorization server via oauth-protected-resource discovery
  try {
    const res = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    if (res.ok) {
      const data = await res.json();
      if (data.authorization_servers && data.authorization_servers.length > 0) {
        issuer = data.authorization_servers[0].replace(/\/$/, '');
        console.log(`Discovered authorization server: ${issuer}`);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch oauth-protected-resource, falling back to PDS as issuer', e);
  }

  // 2. Fetch the metadata from the determined issuer
  const res = await fetch(`${issuer}/.well-known/oauth-authorization-server`);
  if (!res.ok) throw new Error(`Failed to fetch OAuth metadata from issuer (${issuer}): ${res.status}`);
  return res.json();
}

// Helper for random string
function generateRandomString(length: number) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (dec) => ('0' + dec.toString(16)).substr(-2)).join('');
}

// Helper for PKCE
async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Base64URL encode
  const hashArray = Array.from(new Uint8Array(digest));
  const base64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  return base64;
}

export async function startChronoskyOAuth(handle: string): Promise<string> {
  const { did, pdsUrl } = await resolveHandle(handle);
  const metadata = await getOAuthMetadata(pdsUrl);
  
  const dpopKeyPair = await generateDPoPKeyPair();
  const codeVerifier = generateRandomString(64); // 128 chars hex = 64 bytes
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);
  
  sessionStorage.setItem('chronosky_oauth_state', state);
  sessionStorage.setItem('chronosky_code_verifier', codeVerifier);
  localStorage.setItem('chronosky_dpop_keypair', JSON.stringify(dpopKeyPair));
  localStorage.setItem('chronosky_user_did', did);
  
  const proxyRedirectUri = new URL(CHRONOSKY_PROXY_CALLBACK);
  proxyRedirectUri.searchParams.set('callback_url', CHRONOSKY_REDIRECT_URI);
  
  const authUrl = new URL(metadata.authorization_endpoint);
  authUrl.searchParams.set('client_id', CHRONOSKY_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', proxyRedirectUri.toString());
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'atproto transition:generic');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('login_hint', handle);
  
  return authUrl.toString();
}
