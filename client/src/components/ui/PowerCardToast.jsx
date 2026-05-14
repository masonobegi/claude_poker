import React, { useEffect, useState } from 'react';
import './PowerCardToast.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

const DISPLAY_MS = 4500;

export default function PowerCardToast({ events }) {
  // events: [{ id, playerName, card: {name,icon,type,description}, result, ts }]
  // Only show the last 3
  const visible = events.slice(-3);

  return (
    <div className="pct-stack">
      {visible.map((ev, i) => (
        <ToastCard key={ev.id} ev={ev} offset={visible.length - 1 - i} />
      ))}
    </div>
  );
}

function ToastCard({ ev, offset }) {
  const [alive, setAlive] = useState(true);
  const color = TYPE_COLOR[ev.card?.type] || '#9966ff';

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!alive) return null;

  return (
    <div
      className="pct-card"
      style={{ '--tc': color, '--offset': offset }}
    >
      <div className="pct-icon">{ev.card?.icon || '✨'}</div>
      <div className="pct-body">
        <div className="pct-who">
          <span className="pct-player">{ev.playerName}</span>
          <span className="pct-verb"> played </span>
          <span className="pct-name" style={{ color }}>{ev.card?.name}</span>
        </div>
        <div className="pct-desc">{ev.card?.description}</div>
        {ev.result && <div className="pct-result">→ {ev.result}</div>}
      </div>
    </div>
  );
}
