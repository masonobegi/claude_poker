import React, { useEffect, useState } from 'react';
import { POWER_ART } from '../../assets/artUrls';
import './PowerCardToast.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

const DISPLAY_MS = 4500;

export default function PowerCardToast({ events }) {
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
  const [imgFailed, setImgFailed] = useState(false);
  const color = TYPE_COLOR[ev.card?.type] || '#9966ff';
  const artUrl = POWER_ART[ev.card?.definitionId];

  useEffect(() => {
    const t = setTimeout(() => setAlive(false), DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!alive) return null;

  return (
    <div className="pct-card" style={{ '--tc': color, '--offset': offset }}>
      <div className="pct-thumb" style={{ borderColor: color, boxShadow: `0 0 10px ${color}44` }}>
        {artUrl && !imgFailed
          ? <img src={artUrl} className="pct-thumb-img" onError={() => setImgFailed(true)} alt="" />
          : <div className="pct-thumb-fallback" style={{ background: `linear-gradient(135deg, ${color}33, ${color}11)` }} />
        }
      </div>
      <div className="pct-body">
        <div className="pct-who">
          <span className="pct-player">{ev.playerName}</span>
          <span className="pct-verb"> played </span>
          <span className="pct-name" style={{ color }}>{ev.card?.name}</span>
        </div>
        {ev.result && <div className="pct-result">{ev.result}</div>}
      </div>
    </div>
  );
}
