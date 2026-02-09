

import { RichText } from '@atproto/api';
import { useMemo } from 'react';

interface PostCardProps {
  post: any;
  reply?: any; // The reply context if any
  reason?: any; // Reason for inclusion (e.g. Repost)
  currentDid: string;
  onReply: (post: any) => void;
  onQuote: (post: any) => void;
  onDelete: (uri: string) => void;
  onToggleLike: (post: any) => void;
  onToggleRepost: (post: any) => void;
  onClick?: (post: any) => void;
  isMain?: boolean; // If true, display larger (for thread view)
}

function RichTextDisplay({ text, facets }: { text: string, facets?: any[] }) {
  const segments = useMemo(() => {
    const rt = new RichText({ text, facets });
    return Array.from(rt.segments());
  }, [text, facets]);

  return (
    <div className="post-text">
      {segments.map((segment: any, i) => {
        if (segment.link) {
           return (
             <a 
               key={i} 
               href={segment.link.uri} 
               target="_blank" 
               rel="noopener noreferrer" 
               onClick={(e) => e.stopPropagation()}
               style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
             >
               {segment.text}
             </a>
           );
        }

        if (segment.mention) {
            return (
              <span 
                key={i} 
                className="mention"
                onClick={(e) => { e.stopPropagation(); /* Handle navigation */ }}
                style={{ cursor: 'pointer' }}
              >
                {segment.text}
              </span>
            );
        }

        if (segment.tag) {
             return (
              <a 
                key={i} 
                href={`/search?q=${segment.tag.tag}`} 
                onClick={(e) => { e.stopPropagation(); /* Handle navigation */ }}
                style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
              >
                {segment.text}
              </a>
            );
        }

        return <span key={i}>{segment.text}</span>;
      })}
    </div>
  );
}

export function PostCard({ post, reply, reason, currentDid, onReply, onQuote, onDelete, onToggleLike, onToggleRepost, onClick, isMain }: PostCardProps) {
  const isLiked = !!post.viewer?.like;
  const isReposted = !!post.viewer?.repost;
  const images = post.embed?.images || (post.embed?.media?.images) || [];
  
  // Embed Record (Quote) handling
  const embedRecord = post.embed?.record || post.embed?.media?.record;
  const isQuote = embedRecord && embedRecord.$type === 'app.bsky.embed.record#view';
  
  const date = new Date(post.indexedAt);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  let timeString = date.toLocaleDateString();
  if (diff < 60) timeString = 'just now';
  else if (diff < 3600) timeString = `${Math.floor(diff / 60)}m`;
  else if (diff < 86400) timeString = `${Math.floor(diff / 3600)}h`;

  // Repost header logic
  const isReasonRepost = reason && reason.$type === 'app.bsky.feed.defs#reasonRepost';
  const repostedBy = isReasonRepost ? reason.by : null;

  return (
    <article 
      className="post-card" 
      onClick={() => onClick && onClick(post)} 
      style={{ 
        cursor: onClick ? 'pointer' : 'default', 
        flexDirection: isMain ? 'column' : 'row',
        padding: isMain ? '20px' : undefined 
      }}
    >
      {/* Repost Context (Above everything) */}
      {(repostedBy || reply) && !isMain && (
        <div style={{ position: 'absolute', top: 8, left: 48, fontSize: '0.8rem', color: 'var(--text-color-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
           {repostedBy && <><i className="fa-solid fa-retweet"></i> Reposted by {repostedBy.displayName || repostedBy.handle}</>}
        </div>
      )}

      {/* Avatar */}
      <div style={{ marginTop: (repostedBy || reply) && !isMain ? 16 : 0 }}>
        <img 
            src={post.author.avatar || 'https://via.placeholder.com/48'} 
            alt={post.author.handle} 
            className="avatar"
            style={{ width: isMain ? 56 : 48, height: isMain ? 56 : 48 }}
        />
      </div>
      
      <div className="post-content">
          {/* Header */}
          <div className="post-header" style={{ flexDirection: isMain ? 'column' : 'row', alignItems: isMain ? 'flex-start' : 'center', marginBottom: isMain ? 12 : 2 }}>
                <div style={{ display: 'flex', flexDirection: isMain ? 'column' : 'row', gap: isMain ? 0 : 5, alignItems: isMain ? 'flex-start' : 'center' }}>
                    <span className="display-name" style={{ fontSize: isMain ? '1.1rem' : undefined }}>
                        {post.author.displayName || post.author.handle}
                    </span>
                    <span className="handle">@{post.author.handle}</span>
                </div>
                {!isMain && <span className="timestamp">{timeString}</span>}
          </div>

          {/* Body */}
          <div style={{ fontSize: isMain ? '1.25rem' : undefined, marginBottom: 12 }}>
               <RichTextDisplay text={post.record.text} facets={post.record.facets} />
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div className="image-preview-grid" style={{ gridTemplateColumns: images.length === 1 ? '1fr' : 'repeat(2, 1fr)', marginTop: 12 }}>
                {images.map((img: any, i: number) => (
                    <div key={i} className="image-preview-item" style={{ aspectRatio: images.length === 1 ? '16/9' : '1' }}>
                        <img 
                            src={img.thumb} 
                            alt={img.alt} 
                            onClick={(e) => { e.stopPropagation(); window.open(img.fullsize, '_blank'); }}
                            style={{ cursor: 'zoom-in' }}
                        />
                    </div>
                ))}
            </div>
          )}

          {/* Quoted Post */}
          {isQuote && embedRecord.record && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 12, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <img src={embedRecord.record.author.avatar} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    <span style={{ fontWeight: 700, color: 'var(--text-color)' }}>{embedRecord.record.author.displayName}</span>
                    <span style={{ color: 'var(--text-color-secondary)' }}>@{embedRecord.record.author.handle}</span>
                  </div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-color)' }}>
                      {embedRecord.record.value?.text}
                  </div>
              </div>
          )}

          {isMain && <div style={{ color: 'var(--text-color-secondary)', margin: '16px 0', fontSize: '0.95rem' }}>{new Date(post.indexedAt).toLocaleString()}</div>}

          {/* Actions */}
          <div className="post-actions" style={{ borderTop: isMain ? '1px solid var(--border-color)' : 'none', paddingTop: isMain ? 12 : 0 }}>
                <button className="action-group reply" onClick={(e) => { e.stopPropagation(); onReply(post); }}>
                    <div className="action-icon-wrapper"><i className="fa-regular fa-comment"></i></div>
                    <span>{post.replyCount || 0}</span>
                </button>
                
                <button className={`action-group repost ${isReposted ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleRepost(post); }}>
                    <div className="action-icon-wrapper"><i className="fa-solid fa-retweet"></i></div>
                    <span>{post.repostCount || 0}</span>
                </button>

                <button className="action-group quote" onClick={(e) => { e.stopPropagation(); onQuote(post); }}>
                    <div className="action-icon-wrapper"><i className="fa-solid fa-quote-left"></i></div>
                </button>
                
                <button className={`action-group like ${isLiked ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleLike(post); }}>
                    <div className="action-icon-wrapper"><i className={`${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart`}></i></div>
                    <span>{post.likeCount || 0}</span>
                </button>
                
                {post.author.did === currentDid && (
                    <button className="action-group" style={{ color: 'var(--text-color-secondary)' }} onClick={(e) => { e.stopPropagation(); onDelete(post.uri); }}>
                        <div className="action-icon-wrapper"><i className="fa-regular fa-trash-can"></i></div>
                    </button>
                )}
          </div>
      </div>
    </article>
  );
}
