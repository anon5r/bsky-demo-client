export default function handler(request, response) {
  const protocol = request.headers['x-forwarded-proto'] || 'https'; // Default to https in prod
  const host = request.headers['x-forwarded-host'] || request.headers['host'];
  // Ensure host doesn't have multiple values (comma separated)
  const safeHost = Array.isArray(host) ? host[0] : (host || 'localhost:3000');
  
  const origin = `${protocol}://${safeHost}`;

  const metadata = {
    client_id: `${origin}/auth/client-metadata`,
    client_name: "Bluesky Client Demo App",
    client_uri: origin,
    redirect_uris: [
      `${origin}/oauth/callback`
    ],
    scope: "atproto include:app.bsky.authFullApp?aud=did:web:api.bsky.app#bsky_appview include:app.chronosky.authClient?aud=did:web:api.chronosky.app",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    response_mode: "query",
    token_endpoint_auth_method: "none",
    application_type: "web",
    dpop_bound_access_tokens: true
  };

  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.status(200).json(metadata);
}
