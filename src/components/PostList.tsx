import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';

interface PostListProps {
  agent: Agent;
  did: string;
}

export function PostList({ agent, did }: PostListProps) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadPosts() {
    setLoading(true);
    try {
      const response = await agent.getTimeline({ limit: 50 });
      setPosts(response.data.feed);
    } catch (e) {
      console.error("Failed to load timeline", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (did) {
        loadPosts();
    }
  }, [agent, did]);

  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       await agent.deletePost(uri);
       // Optimistic update or reload
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
      setPosts([...posts]); // Trigger re-render
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

  async function handleReply(item: any) {
    const text = prompt(`Reply to @${item.post.author.handle}:`);
    if (!text) return;

    try {
      const root = item.reply?.root || { uri: item.post.uri, cid: item.post.cid };
      const parent = { uri: item.post.uri, cid: item.post.cid };

      await agent.post({
        text,
        reply: { root, parent },
        createdAt: new Date().toISOString()
      });
      alert("Reply sent!");
    } catch (e) {
      console.error("Reply failed", e);
      alert("Reply failed");
    }
  }

  if (loading && posts.length === 0) return <div>Loading timeline...</div>;

  return (
    <div className="card" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-color)' }}>
      <h3>Your Timeline</h3>
      <button onClick={loadPosts} style={{marginBottom: '10px', backgroundColor: 'var(--button-bg)', color: 'var(--button-text)' }}>Refresh</button>
      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
        {posts.map(({ post, reply }) => {
          const isLiked = !!post.viewer?.like;
          const isReposted = !!post.viewer?.repost;
          const images = post.embed?.images || (post.embed?.media?.images) || [];

          return (
            <li key={post.uri} style={{ borderBottom: '1px solid var(--border-color-light)', padding: '15px 0' }}>
              {reply && <small style={{color: 'var(--text-color-secondary)'}}>Replying to user...</small>}
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                {post.author.avatar && (
                  <img 
                    src={post.author.avatar} 
                    alt={post.author.handle} 
                    style={{ width: 30, height: 30, borderRadius: '50%', marginRight: 10 }}
                  />
                )}
                <strong>{post.author.displayName || post.author.handle}</strong>
                <span style={{ color: 'var(--text-color-secondary)', marginLeft: 5 }}>@{post.author.handle}</span>
                <span style={{ color: 'var(--text-color-secondary)', marginLeft: 10, fontSize: '0.8em' }}>
                  {new Date(post.indexedAt).toLocaleString()}
                </span>
              </div>

              <p style={{ margin: '5px 0 10px 0', whiteSpace: 'pre-wrap' }}>{post.record.text}</p>

              {images.length > 0 && (
                <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', marginBottom: '10px' }}>
                  {images.map((img: any, i: number) => (
                    <img 
                      key={i} 
                      src={img.thumb} 
                      alt={img.alt} 
                      style={{ height: 150, borderRadius: 8, border: '1px solid var(--border-color)' }} 
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <button onClick={() => handleReply({ post, reply })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}>
                  💬 Reply
                </button>
                
                <button onClick={() => toggleRepost({ post })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isReposted ? 'var(--success-color)' : 'var(--text-color)' }}>
                  🔁 {post.repostCount || 0}
                </button>
                
                <button onClick={() => toggleLike({ post })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isLiked ? 'var(--error-color)' : 'var(--text-color)' }}>
                  ❤️ {post.likeCount || 0}
                </button>

                {post.author.did === did && (
                  <button 
                      onClick={() => deletePost(post.uri)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error-color)', marginLeft: 'auto' }}
                  >
                      🗑️
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}