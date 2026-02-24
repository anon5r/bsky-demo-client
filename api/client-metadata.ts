const OAUTH_SCOPE = [
  'atproto',
  'include:app.bsky.authFullApp?aud=did:web:api.bsky.app%23bsky_appview',
  'include:app.chronosky.authClient',
  'include:app.chronosky.authClient?aud=*',
  'include:app.chronosky.authClient?aud=did:web:api.chronosky.app%23chronosky_xrpc',
  'blob:image/*',
  'blob:video/*',
];
const CLIENT_NAME = "Bluesky Client Demo App";

export default function handler(request: any, response: any) {
  const protocol = request.headers['x-forwarded-proto'] || 'https';
  const host = request.headers['x-forwarded-host'] || request.headers['host'];
  const safeHost = Array.isArray(host) ? host[0] : (host || 'localhost:3000');
  const requestPath = request.url || '/';
  
  const origin = `${protocol}://${safeHost}`;

  const metadata = {
    client_id: `${origin}${requestPath}`,
    client_name: CLIENT_NAME,
    client_uri: origin,
    redirect_uris: [
      `${origin}/oauth/callback`
    ],
    scope: OAUTH_SCOPE.join(' '),
    resource: "https://api.chronosky.app",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    response_mode: "query",
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true
  };

  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json(metadata);
}