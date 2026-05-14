import React, { useState, useEffect, useRef } from 'react';
import './CardPlayAnnouncement.css';
import { POWER_ART } from '../../assets/artUrls';

const TYPE_COLOR = {
  SPELL:       { primary: '#9966ff', glow: 'rgba(153,102,255,0.4)', label: 'Spell'       },
  ENCHANTMENT: { primary: '#44aaff', glow: 'rgba(68,170,255,0.4)',  label: 'Enchantment' },
  BOUNTY:      { primary: '#ffaa22', glow: 'rgba(255,170,34,0.4)',  label: 'Bounty'      },
};

const DISPLAY_MS = 3800;

export default function CardPlayAnnouncement({ events }) {
  const [current, setCurrent] = useState(null);
  const [exiting, setExiting]  = useState(false);
  const queueRef = useRef([]);
  const timerRef = useRef(null);

  // Feed new events into the queue
  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[events.length - 1];
    if (!latest) return;
    queueRef.current.push(latest);
    if (!current) advanceQueue();
  }, [events]);

  function advanceQueue() {
    if (queueRef.current.length === 0) { setCurrent(null); return; }
    const next = queueRef.current.shift();
    setExiting(false);
    setCurrent(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(advanceQueue, 400);
    }, DISPLAY_MS);
  }

  function dismiss() {
    clearTimeout(timerRef.current);
    setExiting(true);
    setTimeout(advanceQueue, 400);
  }

  if (!current) return null;

  const { playerName, card, result } = current;
  const colors = TYPE_COLOR[card?.type] || TYPE_COLOR.SPELL;
  const artUrl  = POWER_ART[card?.definitionId || ''];

  return (
    <div
      className={`cpa-overlay ${exiting ? 'exit' : 'enter'}`}
      onClick={dismiss}
    >
      <div
        className="cpa-panel"
        style={{ '--cpa-color': colors.primary, '--cpa-glow': colors.glow }}
        onClick={e => e.stopPropagation()}
      >
        {/* Type badge */}
        <div className="cpa-type-badge" style={{ background: colors.primary }}>
          {colors.label}
        </div>

        {/* Card art */}
        <div className="cpa-art-frame">
          {artUrl
            ? <img src={artUrl} className="cpa-art-img" alt={card?.name} draggable={false} />
            : <div className="cpa-art-fallback">{card?.icon || '✨'}</div>
          }
        </div>

        {/* Card name */}
        <div className="cpa-card-name">{card?.name || 'Power Card'}</div>

        {/* Who played it */}
        <div className="cpa-player-line">
          <span className="cpa-player-name">{playerName || 'A player'}</span>
          <span className="cpa-played"> played this card</span>
        </div>

        {/* Effect description */}
        {card?.description && (
          <div className="cpa-desc">{card.description}</div>
        )}

        {/* What actually happened */}
        {result && (
          <div className="cpa-result">
            <span className="cpa-result-arrow">→</span>
            {result}
          </div>
        )}

        {/* Progress bar */}
        <div className="cpa-progress">
          <div className="cpa-progress-fill" style={{ animationDuration: `${DISPLAY_MS}ms` }} />
        </div>

        <div className="cpa-dismiss-hint">click anywhere to dismiss</div>
      </div>
    </div>
  );
}
