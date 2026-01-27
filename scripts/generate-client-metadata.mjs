import fs from 'fs';
import path from 'path';

// Prefer VITE_APP_URL, fall back to VERCEL_URL (which needs https:// prepended), then localhost
let appUrl = process.env.VITE_APP_URL;

if (!appUrl && process.env.VERCEL_URL) {
  appUrl = `https://${process.env.VERCEL_URL}`;
}

if (!appUrl) {
  appUrl = 'http://localhost:5173';
}

console.log(`Generating client metadata for: ${appUrl}`);

const clientMetadata = {
  client_id: `${appUrl}/.well-known/client-metadata.json`,
  client_name: "Third-Party Demo App",
  client_uri: appUrl,
  redirect_uris: [
    `${appUrl}/oauth/callback`,
    `${appUrl}/oauth/chronosky/callback`
  ],
  scope: "atproto transition:generic include:app.chronosky.authClient",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  response_mode: "query",
  token_endpoint_auth_method: "none",
  application_type: "web",
  dpop_bound_access_tokens: true
};

const publicDir = path.resolve('public');
const wellKnownDir = path.join(publicDir, '.well-known');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
if (!fs.existsSync(wellKnownDir)) {
  fs.mkdirSync(wellKnownDir);
}

fs.writeFileSync(
  path.join(wellKnownDir, 'client-metadata.json'),
  JSON.stringify(clientMetadata, null, 2)
);

console.log(`Generated .well-known/client-metadata.json for ${appUrl}`);
