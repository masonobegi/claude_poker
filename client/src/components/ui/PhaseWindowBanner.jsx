import React, { useState, useEffect } from 'react';
import './PhaseWindowBanner.css';

const WINDOW_LABELS = {
  before_deal:              { label: 'Before Deal', desc: 'Play BEFORE DEAL power cards' },
  before_preflop:           { label: 'Pre-Flop Setup', desc: 'Play PRE-FLOP power cards & enchantments' },
  after_flop_before_action: { label: 'After Flop', desc: 'Play AFTER FLOP cards (Mirrored, Reflop, Reborn)' },
  after_turn:               { label: 'After Turn', desc: 'Play AFTER TURN cards (Return/Reriver)' },
  after_river_before_action:{ label: 'After River', desc: 'Play AFTER RIVER cards (Sixth Sense, Return/Reriver)' },
  after_river:              { label: 'After River', desc: 'Last chance: Return/Reriver or ANYTIME cards' },
};

const WINDOW_PHASES = new Set(Object.keys(WINDOW_LABELS));

export default function PhaseWindowBanner({ phase, phaseDeadline, myPlayableCards }) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!phaseDeadline || !WINDOW_PHASES.has(phase)) {
      setSecondsLeft(null);
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, phaseDeadline]);

  if (!WINDOW_PHASES.has(phase) || secondsLeft === null) return null;

  const info = WINDOW_LABELS[phase];
  const pct = phaseDeadline ? Math.max(0, (phaseDeadline - Date.now()) / (phaseDeadline - (phaseDeadline - 12000))) * 100 : 0;
  const hasPlayable = myPlayableCards && myPlayableCards.length > 0;

  return (
    <div className={`phase-window-banner ${hasPlayable ? 'has-playable' : ''}`}>
      <div className="pwb-left">
        <div className={`pwb-pulse-dot ${secondsLeft <= 3 ? 'urgent' : ''}`} />
        <div>
          <div className="pwb-label">{info.label}</div>
          {hasPlayable && <div className="pwb-playable-hint">You have cards to play</div>}
        </div>
      </div>
      <div className="pwb-right">
        <div className={`pwb-timer ${secondsLeft <= 3 ? 'urgent' : ''}`}>{secondsLeft}s</div>
        <div className="pwb-bar-wrap">
          <div
            className="pwb-bar-fill"
            style={{ width: `${Math.max(0, (phaseDeadline - Date.now()) / 12000 * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
