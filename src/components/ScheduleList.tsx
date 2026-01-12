import { useState, useEffect } from 'react';
import { ChronoskyClient, type ScheduleItem } from '../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';

interface ScheduleListProps {
  session: OAuthSession;
}

export function ScheduleList({ session }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');

  const client = new ChronoskyClient(session.accessToken, session.dpopKey);

  async function loadSchedules() {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await client.listPosts({ limit: 50, status: 'pending' });
      setSchedules(response.schedules);
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

  async function deleteSchedule(uri: string) {
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    try {
      await client.deletePost({ uri });
      setSchedules(schedules.filter(s => s.uri !== uri));
    } catch (error: any) {
      console.error("Failed to delete schedule", error);
      alert("Failed to delete schedule: " + error.message);
    }
  }

  if (loading && schedules.length === 0) return <div>Loading schedules...</div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3>Scheduled Posts</h3>
        <button onClick={loadSchedules}>Refresh</button>
      </div>
      
      {errorMsg && <div style={{ color: 'red', marginBottom: '10px', padding: '10px', border: '1px solid red', borderRadius: '4px' }}>{errorMsg}</div>}
      
      {schedules.length === 0 && !loading && !errorMsg && <p>No pending schedules.</p>}

      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
        {schedules.map((schedule) => (
          <li key={schedule.uri} style={{ borderBottom: '1px solid #eee', padding: '15px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>
                Scheduled for: {new Date(schedule.scheduledAt).toLocaleString()}
              </span>
              <span style={{ 
                padding: '2px 6px', 
                borderRadius: '4px', 
                fontSize: '0.8em',
                background: schedule.status === 'pending' ? '#e3f2fd' : '#f5f5f5',
                color: schedule.status === 'pending' ? '#1976d2' : '#666'
              }}>
                {schedule.status}
              </span>
            </div>
            
            <p style={{ margin: '5px 0 10px 0', whiteSpace: 'pre-wrap' }}>{schedule.text}</p>
            
            <button 
              onClick={() => deleteSchedule(schedule.uri)}
              style={{ background: '#fee', border: '1px solid #fcc', color: '#d00', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel Schedule
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
