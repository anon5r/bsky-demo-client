import { useState, useEffect } from 'react';
import { ChronoskyClient, type ScheduledPost } from '../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { decodeProtectedHeader } from 'jose';
import { Modal } from './Modal';
import { PostForm } from './PostForm';
import { Agent } from '@atproto/api';

interface ScheduleListProps {
  session: OAuthSession;
  agent?: Agent; // Pass agent for PostForm (editing)
}

export function ScheduleList({ session, agent }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [editingSchedule, setEditingSchedule] = useState<ScheduledPost | null>(null);

  const client = new ChronoskyClient((url, init) => session.fetchHandler(url, init));
  
  // Helper to format date for input type="datetime-local" (YYYY-MM-DDThh:mm)
  function formatForInput(isoString: string) {
      const date = new Date(isoString);
      const offset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
  }

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
  
  const isEditable = (scheduledAt: string) => {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      return diff > 5 * 60 * 1000; // > 5 mins
  };

  if (loading && (!schedules || schedules.length === 0)) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading schedules...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border-color-dark)' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Queue</h3>
        <button onClick={loadSchedules} className="btn-ghost" style={{ fontSize: '0.9rem' }}>Refresh</button>
      </div>
      
      {errorMsg && <div style={{ color: 'var(--error-color)', padding: 20, textAlign: 'center' }}>
          {errorMsg}
          {debugInfo && <div style={{ fontSize: '0.8rem', marginTop: 10, color: 'var(--text-color-tertiary)' }}>Debug: {debugInfo}</div>}
      </div>}
      
      {(!schedules || schedules.length === 0) && !loading && !errorMsg && 
         <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color-secondary)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>📭</div>
            No pending posts.
         </div>
      }

      <div>
        {schedules?.map((schedule) => (
          <div key={schedule.id} className="post-card" style={{ display: 'block', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                📅 {new Date(schedule.scheduledAt).toLocaleString()}
              </span>
              <span style={{ 
                padding: '2px 8px', 
                borderRadius: 999, 
                fontSize: '0.75rem',
                fontWeight: 700,
                background: schedule.status === 'PENDING' ? 'var(--nav-hover-bg)' : 'var(--bg-color-tertiary)',
                color: schedule.status === 'PENDING' ? 'var(--primary-color)' : 'var(--text-color-secondary)'
              }}>
                {schedule.status}
              </span>
            </div>
            
            <div className="post-text" style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-color)' }}>{schedule.text}</div>
            
            {/* Embed Previews */}
            {schedule.embed && (
                <div style={{ marginTop: 10 }}>
                    {/* Images */}
                    {schedule.embed.$type === 'app.bsky.embed.images' && schedule.embed.images && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                             {schedule.embed.images.map((_: any, i: number) => (
                                 <div key={i} style={{ 
                                     width: 100, height: 100, 
                                     background: 'var(--bg-color-tertiary)', 
                                     borderRadius: 8,
                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     fontSize: '0.8rem', color: 'var(--text-color-tertiary)'
                                 }}>
                                    📷 Image
                                 </div>
                             ))}
                        </div>
                    )}
                    
                    {/* External Link */}
                    {schedule.embed.$type === 'app.bsky.embed.external' && schedule.embed.external && (
                        <div style={{ 
                            border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', marginTop: 8
                        }}>
                             {schedule.embed.external.thumb && <div style={{ height: 100, background: 'var(--bg-color-tertiary)' }}></div>}
                             <div style={{ padding: 10 }}>
                                 <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{schedule.embed.external.title}</div>
                                 <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>{schedule.embed.external.description}</div>
                             </div>
                        </div>
                    )}
                    
                    {/* Record (Quote) */}
                    {(schedule.embed.$type === 'app.bsky.embed.record' || schedule.embed.$type === 'app.bsky.embed.recordWithMedia') && (
                         <div style={{ 
                            border: '1px solid var(--border-color)', borderRadius: 8, padding: 10, marginTop: 8,
                            color: 'var(--text-color-secondary)', fontSize: '0.9rem'
                         }}>
                            <i className="fa-solid fa-quote-left"></i> Quoted Post
                         </div>
                    )}
                </div>
            )}
            
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
               {isEditable(schedule.scheduledAt) && (
                  <button 
                    onClick={() => setEditingSchedule(schedule)}
                    className="btn-ghost"
                    style={{ color: 'var(--primary-color)', fontSize: '0.9rem', padding: '6px 12px' }}
                  >
                    <i className="fa-solid fa-pen"></i> Edit
                  </button>
               )}
              <button 
                onClick={() => deleteSchedule(schedule.id)}
                className="btn-ghost"
                style={{ color: 'var(--error-color)', fontSize: '0.9rem', padding: '6px 12px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>

      {agent && editingSchedule && (
          <Modal isOpen={true} onClose={() => setEditingSchedule(null)} title="Edit Schedule">
             <PostForm 
                 agent={agent}
                 session={session}
                 defaultMode="schedule"
                 postId={editingSchedule.id}
                 initialData={{
                     text: editingSchedule.text,
                     scheduledAt: formatForInput(editingSchedule.scheduledAt),
                     images: (editingSchedule.embed?.$type === 'app.bsky.embed.images') ? editingSchedule.embed.images : [],
                     langs: editingSchedule.langs,
                     // labels: editingSchedule.labels?.values // SelfLabels structure is complex, simplified in client?
                     // Let's assume labels are compatible or just empty for now.
                     // The client interface has labels?: SelfLabels. PostForm expects string[].
                     labels: editingSchedule.labels?.values?.map((v: { val: string }) => v.val) || [],
                     disableQuotes: editingSchedule.disableQuotePosts // interface mismatch? ScheduledPost vs CreateScheduleRequest
                     // Check ScheduledPost definition again. It has disableQuotePosts?: boolean
                 }}
                 onCancel={() => setEditingSchedule(null)}
                 onPostCreated={() => {
                     setEditingSchedule(null);
                     loadSchedules();
                 }}
             />
          </Modal>
      )}
    </div>
  );
}