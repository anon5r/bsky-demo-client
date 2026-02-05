import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// We derive the metadata URL from the current browser location.
// This allows the app to work on any domain (e.g. Vercel preview URLs) 
// as long as the metadata was generated for that domain during build.
const CLIENT_METADATA_URL = `${window.location.origin}/auth/client-metadata?v=3`;

// We use a singleton pattern via getBlueskyClient to ensure we only load when needed
// and with the correct configuration.
let clientInstance: BrowserOAuthClient | null = null;

export async function getBlueskyClient() {
  if (clientInstance) return clientInstance;

  clientInstance = await BrowserOAuthClient.load({
    clientId: CLIENT_METADATA_URL,
    handleResolver: 'https://bsky.social',
    responseMode: 'query',
  });
  return clientInstance;
}
