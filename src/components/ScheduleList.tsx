import { useState, useEffect } from 'react';
import { ChronoskyClient, type ScheduledPost } from '../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { decodeProtectedHeader } from 'jose';

interface ScheduleListProps {
  session: OAuthSession;
}

export function ScheduleList({ session }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));

  async function loadSchedules() {
    setLoading(true);
    setErrorMsg('');
    setDebugInfo('');
    try {
      const tokenInfo = await session.getTokenInfo();
      console.log('ScheduleList: Session Token Info:', tokenInfo);
      
      // Decode header to find algorithm
      let alg = 'unknown';
      try {
          // accessJwt is likely available on the session object if we cast it, 
          // or we can get it from tokenInfo if available (it isn't usually).
          // However, @atproto/oauth-client-browser session stores it.
          // Let's try to get it from the internal session state we logged earlier or just use tokenInfo structure if it exposes it? 
          // Actually session.getTokenInfo() returns info *about* the token, not the raw token string usually.
          // But session object has `getAccessToken()`? No, it handles fetch.
          // We can inspect `(session as any).tokenSet.access_token`.
          const accessToken = (session as any).tokenSet?.access_token;
          if (accessToken) {
              const header = decodeProtectedHeader(accessToken);
              alg = header.alg || 'unknown';
              console.log('ScheduleList: Token Header:', header);
          }
      } catch (e) {
          console.error("Failed to decode token header", e);
      }

      setDebugInfo(`ISS: ${tokenInfo.iss}, ALG: ${alg}`);
      
      const response = await client.listPosts({ limit: 50, status: 'pending' });
      setSchedules(response.posts || []);
    } catch (error: any) {
      console.error("Failed to load schedules", error);
      if (error.error === 'USER_NOT_REGISTERED') {
        setErrorMsg(
          <span>
            To view schedules, you must be registered in Chronosky. <a href="https://chronosky.app" target="_blank" rel="noopener noreferrer">Sign up here</a>.
          </span>
        );
      } else if (error.error === 'INVALID_TOKEN' || error.message?.includes('verify access token')) {
        setErrorMsg("Authentication Error: The server rejected your login token. This might be due to a compatibility issue with your PDS provider (e.g., unsupported signature algorithm). Please report this to the Chronosky administrator.");
      } else {
        setErrorMsg(error.message || "Failed to load schedules");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedules();
  }, [session]);

  async function deleteSchedule(id: string) {
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    try {
      await client.deletePost({ id });
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (error: any) {
      console.error("Failed to delete schedule", error);
      alert("Failed to delete schedule: " + error.message);
    }
  }

  if (loading && (!schedules || schedules.length === 0)) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading schedules...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border-color-dark)' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Queue</h3>
        <button onClick={loadSchedules} className="btn-ghost" style={{ fontSize: '0.9rem' }}>Refresh</button>
      </div>
      
      {errorMsg && <div style={{ color: 'var(--error-color)', padding: 20, textAlign: 'center' }}>
          {errorMsg}
          {debugInfo && <div style={{ fontSize: '0.8rem', marginTop: 10, color: '#999' }}>Debug: {debugInfo}</div>}
      </div>}
      
      {(!schedules || schedules.length === 0) && !loading && !errorMsg && 
         <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
            No pending posts.
         </div>
      }

      <div>
        {schedules?.map((schedule) => (
          <div key={schedule.id} className="post-card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                📅 {new Date(schedule.scheduledAt).toLocaleString()}
              </span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: 999, 
                fontSize: '0.75rem',
                fontWeight: 700,
                background: schedule.status === 'PENDING' ? 'var(--nav-hover-bg)' : '#eee',
                color: schedule.status === 'PENDING' ? 'var(--primary-color)' : '#666'
              }}>
                {schedule.status}
              </span>
            </div>
            
            <div className="post-text" style={{ fontSize: '1rem' }}>{schedule.text}</div>
            
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
              <button 
                onClick={() => deleteSchedule(schedule.id)}
                className="btn-ghost"
                style={{ color: 'var(--error-color)', fontSize: '0.9rem', padding: '6px 12px' }}
              >
                Cancel Post
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}