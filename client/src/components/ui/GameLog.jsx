import React, { useEffect, useRef } from 'react';
import './GameLog.css';

export default function GameLog({ entries, open, onClose }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries, open]);

  return (
    <div className={`gamelog-drawer ${open ? 'open' : ''}`}>
      <div className="gamelog-header">
        <span>Game Log</span>
        <button className="gamelog-close" onClick={onClose}>✕</button>
      </div>
      <div className="gamelog-entries">
        {entries.map(e => (
          <div key={e.id || e.ts} className="gamelog-entry">
            <span className="gamelog-time">
              {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="gamelog-msg">{e.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
