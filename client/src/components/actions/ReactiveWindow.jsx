import React, { useState, useEffect } from 'react';
import './ReactiveWindow.css';

export default function ReactiveWindow({ data, myPowerCards, onPlay }) {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const tick = setInterval(() => {
      const remaining = Math.max(0, (data.deadline - Date.now()) / 1000);
      setTimeLeft(remaining);
    }, 100);
    return () => clearInterval(tick);
  }, [data.deadline]);

  const vetoCard = myPowerCards.find(c => c.definitionId === 'veto');
  const copyCard = myPowerCards.find(c => c.definitionId === 'copy_machine');
  const pct = Math.max(0, (data.deadline - Date.now()) / 10000) * 100;

  return (
    <div className="reactive-banner">
      <div className="reactive-inner">
        <div className="reactive-info">
          <span className="reactive-spell-icon">{data.triggeringCard?.icon || '✨'}</span>
          <div className="reactive-text">
            <div className="reactive-spell-name">{data.triggeringCard?.name || 'Spell'} played</div>
            <div className="reactive-hint">
              {vetoCard || copyCard ? 'You have a reaction available' : 'Waiting for reactions…'}
            </div>
          </div>
          <div className="reactive-countdown">
            <span className="reactive-seconds">{Math.ceil(timeLeft)}</span>
            <span className="reactive-s">s</span>
          </div>
        </div>

        <div className="reactive-bar-wrap">
          <div className="reactive-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        {(vetoCard || copyCard) && (
          <div className="reactive-actions">
            {vetoCard && (
              <button className="reactive-btn reactive-veto" onClick={() => onPlay(vetoCard.instanceId)}>
                ❌ Veto — Cancel this spell
              </button>
            )}
            {copyCard && (
              <button className="reactive-btn reactive-copy" onClick={() => onPlay(copyCard.instanceId)}>
                📠 Copy Machine — Copy this spell
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
