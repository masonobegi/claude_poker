import React, { useState, useEffect } from 'react';
import { POWER_ART } from '../../assets/artUrls';
import './ReactiveWindow.css';

const TYPE_COLOR = {
  SPELL:       '#9966ff',
  ENCHANTMENT: '#44aaff',
  BOUNTY:      '#ffaa22',
};

export default function ReactiveWindow({ data, queue, myPowerCards, onPlay }) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const tick = setInterval(() => {
      setTimeLeft(Math.max(0, (data.deadline - Date.now()) / 1000));
    }, 100);
    return () => clearInterval(tick);
  }, [data.deadline]);

  const vetoCard = myPowerCards.find(c => c.definitionId === 'veto');
  const copyCard = myPowerCards.find(c => c.definitionId === 'copy_machine');
  const pct = Math.max(0, (data.deadline - Date.now()) / 10000) * 100;
  const color = TYPE_COLOR[data.triggeringCard?.type] || '#9966ff';

  return (
    <div className="reactive-banner">
      <div className="reactive-inner" style={{ '--tc': color }}>

        {/* Active spell */}
        <div className="reactive-active-spell">
          <div className="reactive-spell-thumb" style={{ '--tc': color }}>
            {POWER_ART[data.triggeringCard?.definitionId]
              ? <img src={POWER_ART[data.triggeringCard.definitionId]} className="reactive-spell-art" alt="" />
              : <div className="reactive-spell-art-fallback" style={{ background: `linear-gradient(135deg, ${color}44, ${color}22)` }} />
            }
          </div>
          <div className="reactive-spell-info">
            <div className="reactive-spell-name" style={{ color }}>
              {data.triggeringCard?.name || 'Spell'} <span className="reactive-verb">was played</span>
            </div>
            {data.triggeringCard?.description && (
              <div className="reactive-spell-desc">{data.triggeringCard.description}</div>
            )}
          </div>
          <div className="reactive-countdown">
            <span className="reactive-seconds">{Math.ceil(timeLeft)}</span>
            <span className="reactive-s">s</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="reactive-bar-wrap">
          <div className="reactive-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
        </div>

        {/* Reaction buttons */}
        {(vetoCard || copyCard) && (
          <div className="reactive-actions">
            {vetoCard && (
              <button className="reactive-btn reactive-veto" onClick={() => onPlay(vetoCard.instanceId)}>
                <span className="reactive-btn-x">✕</span> Veto
              </button>
            )}
            {copyCard && (
              <button className="reactive-btn reactive-copy" onClick={() => onPlay(copyCard.instanceId)}>
                <span className="reactive-btn-copy-icon" /> Copy
              </button>
            )}
          </div>
        )}

        {/* Queued spells waiting for their own veto window */}
        {queue && queue.length > 0 && (
          <div className="reactive-queue">
            <div className="reactive-queue-label">⏳ Up next ({queue.length} more):</div>
            {queue.map((q, i) => (
              <div key={i} className="reactive-queue-item">
                <span>{q.card?.icon}</span>
                <span className="reactive-queue-name">{q.playerName} → {q.card?.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
