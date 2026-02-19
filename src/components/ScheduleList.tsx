import React, { useState, useEffect, useCallback } from 'react';
import { ChronoskyClient, type ScheduledPost } from '../lib/chronosky-xrpc-client';
import { OAuthSession } from '@atproto/oauth-client-browser';
import { Modal } from './Modal';
import { PostForm } from './PostForm';
import { Agent } from '@atproto/api';
import { ScheduleItem } from './ScheduleItem';

interface ScheduleListProps {
  session: OAuthSession;
  agent?: Agent;
}

export function ScheduleList({ session, agent }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [editingSchedule, setEditingSchedule] = useState<ScheduledPost | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const client = React.useMemo(() => new ChronoskyClient((url, init) => session.fetchHandler(url, init)), [session]);
  
  function formatForInput(isoString: string) {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  const getBlobUrl = (cid: string) => {
    return `https://api.chronosky.app/blob/${session.sub}/${cid}`;
  };

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await client.listPosts({ limit: 50, status: 'PENDING' });
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
  }, [client]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const deleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this scheduled post?")) return;
    try {
      await client.deletePost({ id });
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      console.error("Failed to delete schedule", error);
      alert("Failed to delete schedule: " + error.message);
    }
  };
  
  const isEditable = (scheduledAt: string) => {
    const diff = new Date(scheduledAt).getTime() - Date.now();
    return diff > 5 * 60 * 1000; // > 5 mins
  };

  if (loading && schedules.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-color-secondary)' }}>
        <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
        <p style={{ marginTop: 10 }}>Loading schedules...</p>
      </div>
    );
  }

  return (
    <div className="schedule-list-container" style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 0', 
        borderBottom: '1px solid var(--border-color)',
        marginBottom: 20
      }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Queue</h3>
        <button 
          onClick={loadSchedules} 
          className="btn-ghost" 
          title="Refresh"
          style={{ fontSize: '1.2rem', padding: '8px', color: 'var(--primary-color)' }}
        >
          <i className="fa-solid fa-rotate"></i>
        </button>
      </div>
      
      {errorMsg && (
        <div style={{ color: 'var(--error-color)', padding: 20, textAlign: 'center', background: 'rgba(255,0,0,0.05)', borderRadius: 12, marginBottom: 20 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '1.5rem', marginBottom: 10 }}></i>
          <div style={{ fontSize: '0.95rem' }}>{errorMsg}</div>
        </div>
      )}
      
      {schedules.length === 0 && !loading && !errorMsg && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-color-secondary)', background: 'var(--bg-color-secondary)', borderRadius: 16 }}>
          <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '3rem', marginBottom: 15, opacity: 0.5 }}></i>
          <p style={{ fontSize: '1.1rem' }}>No pending posts in your queue.</p>
        </div>
      )}

      <div className="schedule-items">
        {schedules.map((schedule) => (
          <ScheduleItem
            key={schedule.id}
            schedule={schedule}
            getBlobUrl={getBlobUrl}
            onEdit={setEditingSchedule}
            onDelete={deleteSchedule}
            onPreviewImage={setPreviewImage}
            isEditable={isEditable}
          />
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
              labels: editingSchedule.labels?.values?.map((v: { val: string }) => v.val) || [],
              disableQuotes: editingSchedule.disableQuotePosts
            }}
            onCancel={() => setEditingSchedule(null)}
            onPostCreated={() => {
              setEditingSchedule(null);
              loadSchedules();
            }}
          />
        </Modal>
      )}

      {previewImage && (
        <Modal isOpen={true} onClose={() => setPreviewImage(null)} title="Image Preview">
          <div style={{ textAlign: 'center', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
            <img src={previewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }} />
          </div>
        </Modal>
      )}
    </div>
  );
}
