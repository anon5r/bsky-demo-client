import { useEffect } from 'react';
import { getBlueskyClient } from '../lib/bluesky-oauth';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface OAuthCallbackProps {
  onSuccess: (session?: OAuthSession) => void;
}

export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  async function handleCallback() {
    try {
      const client = await getBlueskyClient();
      const result = await client.initCallback();
      window.history.replaceState({}, document.title, '/');
      onSuccess(result.session);
    } catch (err) {
      console.error("Bluesky sign-in callback failed", err);
    }
  }

  useEffect(() => {
    handleCallback();
  }, []);

  return <div>Processing login...</div>;
}