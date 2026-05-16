import React, { useEffect, useState } from 'react';
import AvatarImage from '../player/AvatarImage';
import './EliminationCeremony.css';

export default function EliminationCeremony({ data }) {
  const [phase, setPhase] = useState('enter'); // enter → shatter → exit

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shatter'), 800);
    const t2 = setTimeout(() => setPhase('exit'), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [data?.playerId]);

  if (!data) return null;

  return (
    <div className={`elim-overlay ${phase}`}>
      <div className="elim-panel">
        <div className="elim-shards">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="elim-shard" style={{ '--i': i }} />
          ))}
        </div>
        <div className={`elim-avatar-wrap ${phase === 'shatter' ? 'shatter' : ''}`}>
          <AvatarImage name={data.name} isBot={data.isBot} size={96} />
        </div>
        <div className="elim-name">{data.name}</div>
        <div className="elim-label">has been eliminated</div>
        <div className="elim-skull">✕</div>
      </div>
    </div>
  );
}
