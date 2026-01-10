import { startChronoskyOAuth } from '../lib/chronosky-oauth';

interface ChronoskyAuthProps {
  handle: string;
  onSuccess?: () => void;
}

export function ChronoskyAuth({ handle }: ChronoskyAuthProps) {
  async function handleAuth() {
    // sessionStorage to remember who we are authorizing for (optional but good for validation)
    sessionStorage.setItem('chronosky_oauth_handle', handle);
    
    try {
      // Start OAuth flow
      const authUrl = await startChronoskyOAuth(handle);
      window.location.href = authUrl;
    } catch (e) {
      console.error("Failed to start Chronosky OAuth", e);
      alert("Failed to start Chronosky OAuth: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="card">
      <h3>Chronosky Integration</h3>
      <p>Connect to Chronosky to schedule posts.</p>
      <button onClick={handleAuth}>Authorize Chronosky</button>
    </div>
  );
}
