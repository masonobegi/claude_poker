import React, { useState, useEffect, useRef } from 'react';
import './CardPlayAnnouncement.css';
import { POWER_ART, AVATAR_ART } from '../../assets/artUrls';

const TYPE_COLOR = {
  SPELL:       { primary: '#9966ff', glow: 'rgba(153,102,255,0.5)', label: 'Spell',       accent: '#bb88ff' },
  ENCHANTMENT: { primary: '#44aaff', glow: 'rgba(68,170,255,0.5)',  label: 'Enchantment', accent: '#88ccff' },
  BOUNTY:      { primary: '#ffaa22', glow: 'rgba(255,170,34,0.5)',  label: 'Bounty',      accent: '#ffcc66' },
};

const DISPLAY_MS = 4500;

export default function CardPlayAnnouncement({ events }) {
  const [current, setCurrent] = useState(null);
  const [exiting, setExiting]  = useState(false);
  const [showResult, setShowResult] = useState(false);
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const resultTimerRef = useRef(null);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[events.length - 1];
    if (!latest) return;
    queueRef.current.push(latest);
    if (!current) advanceQueue();
  }, [events]);

  function advanceQueue() {
    if (queueRef.current.length === 0) { setCurrent(null); setShowResult(false); return; }
    const next = queueRef.current.shift();
    setExiting(false);
    setShowResult(false);
    setCurrent(next);
    clearTimeout(timerRef.current);
    clearTimeout(resultTimerRef.current);
    // Result text animates in after a dramatic pause
    resultTimerRef.current = setTimeout(() => setShowResult(true), 550);
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(advanceQueue, 450);
    }, DISPLAY_MS);
  }

  function dismiss() {
    clearTimeout(timerRef.current);
    clearTimeout(resultTimerRef.current);
    setExiting(true);
    setTimeout(advanceQueue, 450);
  }

  if (!current) return null;

  const { playerName, card, result } = current;
  const colors = TYPE_COLOR[card?.type] || TYPE_COLOR.SPELL;
  const artUrl  = POWER_ART[card?.definitionId || ''];
  const avatarUrl = AVATAR_ART[playerName] || AVATAR_ART.human;

  return (
    <div
      className={`cpa-overlay ${exiting ? 'exit' : 'enter'}`}
      style={{ '--cc': colors.primary, '--cg': colors.glow, '--ca': colors.accent }}
      onClick={dismiss}
    >
      {/* Screen-edge colored border ring */}
      <div className="cpa-border-ring" />

      {/* Full-screen color vignette flash */}
      <div className="cpa-vignette" />

      {/* Main panel */}
      <div className="cpa-panel" onClick={e => e.stopPropagation()}>

        {/* Type badge */}
        <div className="cpa-type-badge">{colors.label}</div>

        {/* Card art — center, massive */}
        <div className="cpa-art-frame">
          {artUrl
            ? <img src={artUrl} className="cpa-art-img" alt={card?.name} draggable={false} />
            : <div className="cpa-art-fallback" />
          }
          <div className="cpa-art-shimmer" />
        </div>

        {/* Card name — GIANT headline */}
        <div className="cpa-card-name">{card?.name || 'Power Card'}</div>

        {/* Who played it */}
        <div className="cpa-who-row">
          <img src={avatarUrl} className="cpa-avatar" alt={playerName} draggable={false}
               onError={e => { e.target.style.display='none'; }} />
          <div className="cpa-who-text">
            <span className="cpa-player-name">{playerName || 'A player'}</span>
            <span className="cpa-played"> unleashed this</span>
          </div>
        </div>

        {/* Description */}
        {card?.description && (
          <div className="cpa-desc">{card.description}</div>
        )}

        {/* RESULT — big, animated in separately */}
        {result && (
          <div className={`cpa-result-box ${showResult ? 'visible' : ''}`}>
            <div className="cpa-result-label">What happened</div>
            <div className="cpa-result-text">{result}</div>
          </div>
        )}

        {/* Progress bar */}
        <div className="cpa-progress">
          <div className="cpa-progress-fill" style={{ animationDuration: `${DISPLAY_MS}ms` }} />
        </div>

        <div className="cpa-dismiss-hint">tap to dismiss</div>
      </div>
    </div>
  );
}
