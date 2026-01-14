import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';

interface UserListProps {
  agent: Agent;
  did: string;
  type: 'followers' | 'following';
  onSelectActor: (did: string) => void;
}

export function UserList({ agent, did, type, onSelectActor }: UserListProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [agent, did, type]);

  async function loadUsers() {
    setLoading(true);
    try {
      let res;
      if (type === 'followers') {
         res = await agent.getFollowers({ actor: did, limit: 50 });
         setUsers(res.data.followers);
      } else {
         res = await agent.getFollows({ actor: did, limit: 50 });
         setUsers(res.data.follows);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{padding: 20}}>Loading...</div>;

  return (
    <div>
       <div style={{ padding: '15px 20px', fontWeight: 'bold', fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)' }}>
          {type === 'followers' ? 'Followers' : 'Following'}
       </div>
       {users.map(actor => (
          <div 
             key={actor.did} 
             className="post-card" 
             style={{ alignItems: 'center' }} 
             onClick={() => onSelectActor(actor.did)}
          >
             <img src={actor.avatar} className="avatar" style={{width: 48, height: 48}} />
             <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>{actor.displayName || actor.handle}</div>
                <div style={{ color: 'var(--text-color-secondary)' }}>@{actor.handle}</div>
                {actor.description && <div style={{ fontSize: '0.9rem', marginTop: 5, color: 'var(--text-color)' }}>{actor.description}</div>}
             </div>
          </div>
       ))}
    </div>
  );
}
