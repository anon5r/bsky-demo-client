import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';

interface PostListProps {
  agent: Agent;
  did: string;
  filter?: 'timeline' | 'author';
}

export function PostList({ agent, did, filter = 'timeline' }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadPosts() {
    setLoading(true);
    try {
      let feed: any[] = [];
      if (filter === 'author') {
          const response = await agent.getAuthorFeed({ actor: did, limit: 50 });
          feed = response.data.feed;
      } else {
          const response = await agent.getTimeline({ limit: 50 });
          feed = response.data.feed;
      }
      setPosts(feed);
    } catch (e) {
      console.error("Failed to load posts", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (did) {
        loadPosts();
    }
  }, [agent, did, filter]);

  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       await agent.deletePost(uri);
       setPosts(posts.filter(p => p.post.uri !== uri));
    } catch (e) {
        console.error("Failed to delete post", e);
        alert("Failed to delete post");
    }
  }

  async function toggleLike(item: any) {
    const cid = item.post.cid;
    const uri = item.post.uri;
    const likeUri = item.post.viewer?.like;

    try {
      if (likeUri) {
        await agent.deleteLike(likeUri);
        item.post.viewer.like = undefined;
        item.post.likeCount = (item.post.likeCount || 0) - 1;
      } else {
        const res = await agent.like(uri, cid);
        item.post.viewer.like = res.uri;
        item.post.likeCount = (item.post.likeCount || 0) + 1;
      }
      setPosts([...posts]);
    } catch (e) {
      console.error("Like failed", e);
    }
  }

  async function toggleRepost(item: any) {
    const cid = item.post.cid;
    const uri = item.post.uri;
    const repostUri = item.post.viewer?.repost;

    try {
      if (repostUri) {
        await agent.deleteRepost(repostUri);
        item.post.viewer.repost = undefined;
        item.post.repostCount = (item.post.repostCount || 0) - 1;
      } else {
        const res = await agent.repost(uri, cid);
        item.post.viewer.repost = res.uri;
        item.post.repostCount = (item.post.repostCount || 0) + 1;
      }
      setPosts([...posts]);
    } catch (e) {
      console.error("Repost failed", e);
    }
  }

  if (loading && posts.length === 0) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>Loading...</div>;
  }

  if (posts.length === 0 && !loading) {
      return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-color-secondary)' }}>No posts found.</div>;
  }

  return (
    <div>
        {posts.map(({ post, reply }) => {
          const isLiked = !!post.viewer?.like;
          const isReposted = !!post.viewer?.repost;
          const images = post.embed?.images || (post.embed?.media?.images) || [];
          
          // Basic elapsed time formatting
          const date = new Date(post.indexedAt);
          const now = new Date();
          const diff = (now.getTime() - date.getTime()) / 1000;
          let timeString = date.toLocaleDateString();
          if (diff < 60) timeString = 'just now';
          else if (diff < 3600) timeString = `${Math.floor(diff / 60)}m`;
          else if (diff < 86400) timeString = `${Math.floor(diff / 3600)}h`;

          return (
            <div key={post.uri} className="post-card">
              <img 
                src={post.author.avatar || 'https://via.placeholder.com/48'} 
                alt={post.author.handle} 
                className="avatar"
              />
              
              <div className="post-content">
                  {reply && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)', marginBottom: 4 }}>
                          Replying to users...
                      </div>
                  )}
                  
                  <div className="post-header">
                      <span className="display-name">{post.author.displayName || post.author.handle}</span>
                      <span className="handle">@{post.author.handle}</span>
                      <span className="timestamp">· {timeString}</span>
                  </div>

                  <div className="post-text">{post.record.text}</div>

                  {images.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)`, gap: 4, marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                      {images.map((img: any, i: number) => (
                        <img 
                          key={i} 
                          src={img.thumb} 
                          alt={img.alt} 
                          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => window.open(img.fullsize, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  <div className="post-actions">
                    <div className="action-item reply" onClick={() => alert("Reply feature coming soon!")}>
                       💬 {post.replyCount || 0}
                    </div>
                    <div className={`action-item repost ${isReposted ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleRepost({ post }); }}>
                       🔁 {post.repostCount || 0}
                    </div>
                    <div className={`action-item like ${isLiked ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike({ post }); }}>
                       {isLiked ? '❤️' : '♡'} {post.likeCount || 0}
                    </div>
                    {post.author.did === did && (
                        <div className="action-item" style={{ color: 'var(--error-color)' }} onClick={(e) => { e.stopPropagation(); deletePost(post.uri); }}>
                            🗑️
                        </div>
                    )}
                  </div>
              </div>
            </div>
          );
        })}
    </div>
  );
}
