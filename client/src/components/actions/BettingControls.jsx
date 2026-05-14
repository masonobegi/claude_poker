import React, { useState } from 'react';
import './BettingControls.css';

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function BettingControls({ callAmount, minRaise, maxRaise, chips, onAction }) {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && chips >= callAmount;
  const canRaise = chips > callAmount;

  const handleRaise = () => {
    const amount = Math.max(minRaise, Math.min(maxRaise, raiseAmount));
    onAction('raise', amount);
  };

  return (
    <div className="betting-controls">
      <button className="bet-btn bet-fold" onClick={() => onAction('fold')}>
        Fold
      </button>

      {canCheck
        ? <button className="bet-btn bet-check" onClick={() => onAction('check')}>
            Check
          </button>
        : <button
            className="bet-btn bet-call"
            onClick={() => onAction('call')}
            disabled={!canCall}
          >
            Call {fmt(callAmount)}
          </button>
      }

      {canRaise && (
        <div className="bet-raise-group">
          <button className="bet-btn bet-raise" onClick={handleRaise}>
            Raise {fmt(raiseAmount)}
          </button>
          <input
            type="range"
            className="bet-slider"
            min={minRaise}
            max={maxRaise}
            step={Math.max(1, Math.floor(minRaise / 2))}
            value={raiseAmount}
            onChange={e => setRaiseAmount(parseInt(e.target.value))}
          />
          <div className="bet-presets">
            {[0.5, 0.75, 1].map(f => {
              const pot = Math.floor(chips * f);
              return (
                <button
                  key={f}
                  className="bet-preset"
                  onClick={() => setRaiseAmount(Math.min(maxRaise, Math.max(minRaise, pot)))}
                >
                  {f === 1 ? 'All-in' : `${f * 100}%`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
