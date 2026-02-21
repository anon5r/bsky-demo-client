import React from 'react';
import { type ScheduledPost } from '../lib/chronosky-xrpc-client';
import { ImageThumbnail } from './ImageThumbnail';

interface ScheduleItemProps {
  schedule: ScheduledPost;
  getBlobUrl: (cid: string) => string;
  onEdit: (schedule: ScheduledPost) => void;
  onDelete: (id: string) => void;
  onPreviewImage: (url: string) => void;
  isEditable: (scheduledAt: string) => boolean;
  fetchHandler?: (url: string, init?: RequestInit) => Promise<Response>;
}

export const ScheduleItem = React.memo(({
  schedule,
  onEdit,
  onDelete,
  onPreviewImage,
  isEditable,
  fetchHandler,
}: ScheduleItemProps) => {
  // Extract images from embed using Chronosky Lexicon view schema
  let images: any[] = [];
  const embedType = schedule.embed?.$type;
  if (embedType === 'app.chronosky.schedule.listPosts#imageView') {
    images = schedule.embed!.images || [];
  } else if (embedType === 'app.bsky.embed.recordWithMedia' || embedType === 'app.bsky.embed.recordWithMedia#view') {
    images = schedule.embed!.media?.images || [];
  }

  return (
    <div className="post-card" style={{ display: 'block', cursor: 'default', padding: '16px', borderRadius: 12, marginBottom: 12, border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="fa-regular fa-calendar-check" style={{ color: 'var(--primary-color)' }}></i>
          {new Date(schedule.scheduledAt).toLocaleString()}
        </span>
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: 20, 
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          background: schedule.status === 'PENDING' ? 'rgba(0, 133, 255, 0.1)' : 'var(--bg-color-tertiary)',
          color: schedule.status === 'PENDING' ? 'var(--primary-color)' : 'var(--text-color-secondary)'
        }}>
          {schedule.status}
        </span>
      </div>
      
      <div className="post-text" style={{ fontSize: '1rem', whiteSpace: 'pre-wrap', color: 'var(--text-color)', lineHeight: 1.5 }}>
        {schedule.text}
      </div>
      
      {/* Embed Previews */}
      {schedule.embed && (
        <div style={{ marginTop: 12 }}>
          {/* Images Grid */}
          {images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: images.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: 8, marginBottom: 8 }}>
              {images.map((img: any, i: number) => {
                // Use thumb URL from Lexicon view schema
                const thumbUrl = img.thumb;
                const fullsizeUrl = img.fullsize || img.thumb;
                if (!thumbUrl) return null;
                
                return (
                  <div key={i} className="image-preview-item" style={{ width: '100%', aspectRatio: images.length === 1 ? '16/9' : '1/1', cursor: 'zoom-in', borderRadius: 8, overflow: 'hidden' }} onClick={() => onPreviewImage(fullsizeUrl)}>
                    <ImageThumbnail 
                      url={thumbUrl} 
                      alt={img.alt} 
                      fetchHandler={fetchHandler}
                      style={{ width: '100%', height: '100%' }} 
                    />
                  </div>
                );
              })}
            </div>
          )}
          
          {/* External Link */}
          {schedule.embed.$type.includes('app.bsky.embed.external') && schedule.embed.external && (
            <div style={{ 
              border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', marginTop: 8
            }}>
              <div style={{ padding: 12, background: 'var(--bg-color-secondary)' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-color)', fontSize: '0.95rem' }}>{schedule.embed.external.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginTop: 4 }}>{schedule.embed.external.description}</div>
              </div>
            </div>
          )}
          
          {/* Record (Quote) */}
          {(schedule.embed.$type.includes('app.bsky.embed.record')) && (
            <div style={{ 
              border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, marginTop: 8,
              color: 'var(--text-color-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(0,0,0,0.02)'
            }}>
              <i className="fa-solid fa-quote-left" style={{ color: 'var(--border-color)' }}></i>
              <span>Quoted Post</span>
            </div>
          )}
        </div>
      )}
      
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
        {isEditable(schedule.scheduledAt) && (
          <button 
            onClick={() => onEdit(schedule)}
            className="btn-ghost"
            title="Edit"
            style={{ color: 'var(--primary-color)', fontSize: '1.2rem', padding: '6px' }}
          >
            <i className="fa-solid fa-pen-to-square"></i>
          </button>
        )}
        <button 
          onClick={() => onDelete(schedule.id)}
          className="btn-ghost"
          title="Delete"
          style={{ color: 'var(--error-color)', fontSize: '1.2rem', padding: '6px' }}
        >
          <i className="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  );
});

ScheduleItem.displayName = 'ScheduleItem';
