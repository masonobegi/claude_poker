import React, { useState, useEffect } from 'react';
import './ReactiveWindow.css';

export default function ReactiveWindow({ data, myPowerCards, onPlay, onSkip }) {
  const [timeLeft, setTimeLeft] = useState(5);
  const reactiveCards = myPowerCards.filter(c => ['veto','copy_machine'].includes(c.definitionId));

  useEffect(() => {
    const deadline = data.deadline;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(tick);
    }, 200);
    return () => clearInterval(tick);
  }, [data.deadline]);

  if (reactiveCards.length === 0) return null;

  return (
    <div className="reactive-banner">
      <div className="reactive-content">
        <div className="reactive-title">
          ⚡ Reactive Window <span className="reactive-timer">{timeLeft}s</span>
        </div>
        <div className="reactive-desc">
          <span className="reactive-card-name">{data.triggeringCard?.name || 'Spell'}</span> was played!
          You can Veto or Copy it.
        </div>
        <div className="reactive-timer-bar">
          <div
            className="reactive-timer-fill"
            style={{ width: `${(timeLeft / 5) * 100}%` }}
          />
        </div>
        <div className="reactive-actions">
          {reactiveCards.map(card => (
            <button
              key={card.instanceId}
              className="reactive-btn"
              onClick={() => onPlay(card.instanceId)}
            >
              {card.icon} {card.name}
            </button>
          ))}
          <button className="reactive-skip" onClick={onSkip}>Pass</button>
        </div>
      </div>
    </div>
  );
}
