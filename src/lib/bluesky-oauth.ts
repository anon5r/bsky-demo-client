import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const CLIENT_METADATA_URL = `${APP_URL}/.well-known/client-metadata.json`;

export const blueskyClient = new BrowserOAuthClient({
  clientMetadata: undefined, // Fetched from clientMetadataUrl
  handleResolver: 'https://bsky.social',
});

// Since clientMetadataUrl is deprecated or changed in newer versions (or specific to how we initialize), 
// let's follow the standard pattern of loading it via `load` or just initializing if constructor allows.
// The guide says:
// const client = await BrowserOAuthClient.load({
//   clientId: CLIENT_METADATA_URL,
//   ...
// });

// So we will export a function to get or load the client instance.

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
