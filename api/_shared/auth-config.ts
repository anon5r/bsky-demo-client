export const OAUTH_SCOPE = [
  'atproto',
  'include:app.bsky.authFullApp?aud=did:web:api.bsky.app#bsky_appview',
  'include:app.chronosky.authClient',
  'include:app.chronosky.authClient?aud=*',
  'include:app.chronosky.authClient?aud=did:web:api.chronosky.app#chronosky_xrpc',
  'blob:image/*',
  'blob:video/*',
];
export const CLIENT_NAME = "Bluesky Client Demo App";