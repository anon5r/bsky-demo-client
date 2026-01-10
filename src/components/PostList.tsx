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
      // Fetch author feed
      const response = await agent.getAuthorFeed({ actor: did });
      setPosts(response.data.feed);
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
  }, [agent, did]);

  async function deletePost(uri: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
       // uri format: at://did/collection/rkey
       const parts = uri.split('/');
       const rkey = parts.pop();
       const collection = parts.pop();
       
       if (collection && rkey) {
           await agent.deletePost(uri);
           loadPosts();
       }
    } catch (e) {
        console.error("Failed to delete post", e);
        alert("Failed to delete post");
    }
  }

  if (loading && posts.length === 0) return <div>Loading posts...</div>;

  return (
    <div className="card">
      <h3>Your Timeline (Last 50)</h3>
      <button onClick={loadPosts}>Refresh</button>
      <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left' }}>
        {posts.map((item) => (
          <li key={item.post.uri} style={{ borderBottom: '1px solid #ccc', padding: '10px 0' }}>
            <p>{item.post.record.text}</p>
            <small>{new Date(item.post.indexedAt).toLocaleString()}</small>
            {item.post.author.did === did && (
                <button 
                    onClick={() => deletePost(item.post.uri)}
                    style={{ marginLeft: '10px', fontSize: '0.8em', padding: '2px 5px' }}
                >
                    Delete
                </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
