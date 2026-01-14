import { useState, useEffect } from 'react';
import { ChronoskyClient, type ScheduledPost } from '../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface ScheduleListProps {
  session: OAuthSession;
}

export function ScheduleList({ session }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');

  const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));

  async function loadSchedules() {
    setLoading(true);
    setErrorMsg('');
    try {
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

  if (loading && (!schedules || schedules.length === 0)) return <div>Loading schedules...</div>;

  return (
    <div className="card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3>Scheduled Posts</h3>
        <button onClick={loadSchedules} style={{ backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }}>Refresh</button>
      </div>
      
      {errorMsg && <div style={{ color: 'var(--error-color)', marginBottom: '10px', padding: '10px', border: '1px solid var(--error-color)', borderRadius: '4px', backgroundColor: 'var(--error-bg)' }}>{errorMsg}</div>}
      
      {(!schedules || schedules.length === 0) && !loading && !errorMsg && <p>No pending schedules.</p>}

      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
        {schedules?.map((schedule) => (
          <li key={schedule.id} style={{ borderBottom: '1px solid var(--border-color-light)', padding: '15px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--text-color-secondary)' }}>
                Scheduled for: {new Date(schedule.scheduledAt).toLocaleString()}
              </span>
              <span style={{ 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '0.8em',
                background: schedule.status === 'PENDING' ? 'rgba(25, 118, 210, 0.1)' : 'var(--card-bg-secondary)',
                color: schedule.status === 'PENDING' ? 'var(--primary-color)' : 'var(--text-color-secondary)'
              }}>
                {schedule.status}
              </span>
            </div>
            
            <p style={{ margin: '5px 0 10px 0', whiteSpace: 'pre-wrap' }}>{schedule.content}</p>
            
            <button 
              onClick={() => deleteSchedule(schedule.id)}
              style={{ background: 'var(--error-bg)', border: '1px solid var(--error-color)', color: 'var(--error-color)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel Schedule
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
