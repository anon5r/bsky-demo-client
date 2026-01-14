import { useState, useEffect } from 'react';
import { Agent } from '@atproto/api';

interface UserProfileProps {
  agent: Agent;
  did: string;
}

export function UserProfile({ agent, did }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (did) {
      agent.getProfile({ actor: did }).then(res => {
        setProfile(res.data);
      }).catch(console.error);
    }
  }, [agent, did]);

  if (!profile) return <div style={{ padding: '10px' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', cursor: 'pointer' }}>
       {profile.avatar ? (
         <img src={profile.avatar} className="avatar" alt={profile.handle} style={{ width: 40, height: 40 }} />
       ) : (
         <div className="avatar" style={{ width: 40, height: 40, background: '#ccc' }} />
       )}
       <div style={{ overflow: 'hidden' }}>
          <div className="display-name" style={{ fontSize: '0.95rem' }}>{profile.displayName || profile.handle}</div>
          <div className="handle" style={{ fontSize: '0.85rem' }}>@{profile.handle}</div>
       </div>
    </div>
  );
}
