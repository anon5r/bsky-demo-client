import { useState } from 'react';
import { Agent } from '@atproto/api';

interface SearchProps {
  agent: Agent;
  onSelectActor: (did: string) => void;
}

export function Search({ agent, onSelectActor }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await agent.searchActors({ term: query, limit: 25 });
      setResults(res.data.actors);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ padding: 20, borderBottom: '1px solid var(--border-color)' }}>
         <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
            <input 
               type="text" 
               value={query} 
               onChange={e => setQuery(e.target.value)} 
               placeholder="Search users..." 
               style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary" disabled={loading}>
               {loading ? 'Searching...' : 'Search'}
            </button>
         </form>
      </div>

      <div>
         {results.map(actor => (
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
                  {actor.description && <div style={{ fontSize: '0.9rem', marginTop: 5 }}>{actor.description}</div>}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
