import { useEffect } from 'react';
import { getBlueskyClient } from '../lib/bluesky-oauth';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface OAuthCallbackProps {
  onSuccess: (session?: OAuthSession) => void;
  onError: (err: unknown) => void;
}

export function OAuthCallback({ onSuccess, onError }: OAuthCallbackProps) {
  async function handleCallback() {
    try {
      const client = await getBlueskyClient();
      const result = await client.initCallback();
      window.history.replaceState({}, document.title, '/');
      onSuccess(result.session);
    } catch (err) {
      console.error("Bluesky sign-in callback failed", err);
      onError(err);
    }
  }

  useEffect(() => {
    handleCallback();
  }, []);

  return <div>Processing login...</div>;
}