import { useEffect } from 'react';
import { getBlueskyClient } from '../lib/bluesky-oauth';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface OAuthCallbackProps {
  onSuccess: (session?: OAuthSession) => void;
}

export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  useEffect(() => {
    handleCallback();
  }, []);
  
  async function handleCallback() {
    const searchParams = new URLSearchParams(window.location.search);
    
    // pathname check
    const isChronoskyCallback = window.location.pathname === '/oauth/chronosky/callback';
    
    if (isChronoskyCallback) {
        // Chronosky OAuth callback (proxy flow)
        // const code = searchParams.get('code'); // unused
        const state = searchParams.get('state');
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const expiresAt = searchParams.get('expires_at');

        if (!state) {
             console.error('No state returned');
             return;
        }

        const storedState = sessionStorage.getItem('chronosky_oauth_state');
        if (state !== storedState) {
            console.error('Invalid state parameter');
            return; // Or show error
        }

        if (!token) {
             console.error('No access token provided by Chronosky API proxy');
             return;
        }

        const chronoskyTokens = {
            accessToken: token,
            refreshToken: refreshToken || '',
            expiresAt: expiresAt ? parseInt(expiresAt, 10) : (Date.now() + 3600 * 1000),
        };

        localStorage.setItem('chronosky_tokens', JSON.stringify(chronoskyTokens));

        // Cleanup
        sessionStorage.removeItem('chronosky_oauth_state');
        sessionStorage.removeItem('chronosky_code_verifier');
        sessionStorage.removeItem('chronosky_oauth_handle');

        window.history.replaceState({}, document.title, '/');
        onSuccess();
    } else {
      // Bluesky OAuth callback
      try {
        const client = await getBlueskyClient();
        const result = await client.initCallback();
        window.history.replaceState({}, document.title, '/');
        onSuccess(result.session);
      } catch (err) {
        console.error("Bluesky sign-in callback failed", err);
      }
    }
  }

  return <div>Processing login...</div>;
}
