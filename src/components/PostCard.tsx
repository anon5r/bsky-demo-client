

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
    <div className="post-text" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
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
              <a 
                key={i} 
                href={`/profile/${segment.mention.did}`} 
                onClick={(e) => { e.stopPropagation(); /* Handle navigation */ }}
                style={{ color: 'var(--primary-color)', textDecoration: 'none' }}
              >
                {segment.text}
              </a>
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
    <div 
      className="post-card" 
      onClick={() => onClick && onClick(post)} 
      style={{ cursor: onClick ? 'pointer' : 'default', backgroundColor: isMain ? 'var(--card-bg-hover)' : undefined }}
    >
      <img 
        src={post.author.avatar || 'https://via.placeholder.com/48'} 
        alt={post.author.handle} 
        className="avatar"
        style={{ width: isMain ? 56 : 48, height: isMain ? 56 : 48 }}
        onClick={(e) => { e.stopPropagation(); /* Go to profile? */ }}
      />
      
      <div className="post-content" style={{ flex: 1 }}>
          {/* Repost / Reply Header context */}
          {(repostedBy || reply) && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
               {repostedBy && (
                   <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-retweet"></i>
                      Reposted by <strong>{repostedBy.displayName || repostedBy.handle}</strong>
                   </span>
               )}
               
               {repostedBy && reply && <span>&gt;</span>}

               {reply && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="fa-solid fa-reply"></i>
                      Replying to @{reply.parent?.author?.handle || 'user'}
                  </span>
               )}
            </div>
          )}

          <div className="post-header" style={{ flexDirection: isMain ? 'column' : 'row', alignItems: isMain ? 'flex-start' : 'center' }}>
                <div style={{ display: 'flex', flexDirection: isMain ? 'column' : 'row', gap: isMain ? 0 : 5 }}>
                    <span className="display-name" style={{ fontSize: isMain ? '1.1rem' : undefined }}>{post.author.displayName || post.author.handle}</span>
                    <span className="handle">@{post.author.handle}</span>
                </div>
                <span className="timestamp">· {timeString}</span>
          </div>

          <div style={{ fontSize: isMain ? '1.2rem' : undefined, lineHeight: isMain ? 1.5 : undefined }}>
               <RichTextDisplay text={post.record.text} facets={post.record.facets} />
          </div>

            {images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)`, gap: 4, marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                {images.map((img: any, i: number) => (
                    <img 
                    key={i} 
                    src={img.thumb} 
                    alt={img.alt} 
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); window.open(img.fullsize, '_blank'); }}
                    />
                ))}
                </div>
            )}

            {/* Quoted Post Display */}
            {isQuote && embedRecord.record && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 12, padding: 10, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <img src={embedRecord.record.author.avatar} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    <strong>{embedRecord.record.author.displayName}</strong>
                    <span style={{ color: 'var(--text-color-secondary)' }}>@{embedRecord.record.author.handle}</span>
                    </div>
                    <div>
                        {embedRecord.record.value?.text}
                        {/* We could use RichTextDisplay here too if facets are available, but quoted record often has simple value */}
                    </div>
                </div>
            )}

            <div className="post-actions" style={{ marginTop: isMain ? 15 : 10, borderTop: isMain ? '1px solid var(--border-color)' : 'none', paddingTop: isMain ? 10 : 0 }}>
                <div className="action-item reply" onClick={(e) => { e.stopPropagation(); onReply(post); }}>
                <i className="fa-regular fa-comment"></i> {post.replyCount || 0}
                </div>
                
                <div className={`action-item repost ${isReposted ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleRepost(post); }}>
                <i className="fa-solid fa-retweet"></i> {post.repostCount || 0}
                </div>

                <div className="action-item quote" onClick={(e) => { e.stopPropagation(); onQuote(post); }}>
                <i className="fa-solid fa-quote-left"></i>
                </div>
                
                <div className={`action-item like ${isLiked ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleLike(post); }}>
                <i className={`${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart`}></i> {post.likeCount || 0}
                </div>
                
                {post.author.did === currentDid && (
                    <div className="action-item" style={{ color: 'var(--error-color)' }} onClick={(e) => { e.stopPropagation(); onDelete(post.uri); }}>
                        <i className="fa-regular fa-trash-can"></i>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
