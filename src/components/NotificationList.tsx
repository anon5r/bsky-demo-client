import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';

interface NotificationListProps {
  agent: Agent;
}

export function NotificationList({ agent }: NotificationListProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Mark as read on unmount or after load? 
    // Usually on load + delay or manual. For simplicity, just load.
    return () => {
        agent.updateSeenNotifications(new Date().toISOString()).catch(console.error);
    };
  }, [agent]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await agent.listNotifications({ limit: 50 });
      setNotifications(res.data.notifications);
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading && notifications.length === 0) return <div style={{padding: 20}}>Loading...</div>;

  return (
    <div>
      {notifications.map(notif => {
        const author = notif.author;
        let content = null;
        let icon = null;

        switch (notif.reason) {
          case 'like':
            icon = <i className="fa-solid fa-heart" style={{color: 'var(--error-color)'}}></i>;
            content = "liked your post";
            break;
          case 'repost':
            icon = <i className="fa-solid fa-retweet" style={{color: 'var(--success-color)'}}></i>;
            content = "reposted your post";
            break;
          case 'follow':
            icon = <i className="fa-solid fa-user-plus" style={{color: 'var(--primary-color)'}}></i>;
            content = "followed you";
            break;
          case 'reply':
            icon = <i className="fa-solid fa-reply" style={{color: 'var(--text-color-secondary)'}}></i>;
            content = "replied to you";
            break;
          case 'quote':
            icon = <i className="fa-solid fa-quote-left" style={{color: 'var(--text-color-secondary)'}}></i>;
            content = "quoted your post";
            break;
          case 'mention':
            icon = <i className="fa-solid fa-at" style={{color: 'var(--primary-color)'}}></i>;
            content = "mentioned you";
            break;
          default:
            icon = <i className="fa-solid fa-bell"></i>;
            content = notif.reason;
        }

        return (
          <div key={notif.uri} className="post-card" style={{ alignItems: 'center' }}>
             <div style={{ fontSize: '1.2rem', width: 40, textAlign: 'center' }}>{icon}</div>
             <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                   <img src={author.avatar} className="avatar" style={{width: 30, height: 30}} />
                   <strong>{author.displayName || author.handle}</strong>
                   <span style={{color: 'var(--text-color-secondary)'}}>{content}</span>
                   <span style={{color: 'var(--text-color-secondary)', marginLeft: 'auto', fontSize: '0.8rem'}}>
                      {new Date(notif.indexedAt).toLocaleDateString()}
                   </span>
                </div>
                {(notif.reason === 'reply' || notif.reason === 'quote' || notif.reason === 'mention') && notif.record.text && (
                   <div className="post-text" style={{ 
                       color: 'var(--text-color)', 
                       marginTop: 5, 
                       padding: '8px 12px', 
                       backgroundColor: 'var(--card-bg-secondary)', 
                       borderRadius: 8,
                       borderLeft: '4px solid var(--border-color)'
                   }}>
                       {notif.record.text}
                   </div>
                )}
             </div>
          </div>
        );
      })}
    </div>
  );
}
