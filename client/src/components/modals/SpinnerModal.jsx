import React, { useState, useEffect } from 'react';
import './SpinnerModal.css';

export default function SpinnerModal({ result, onClose }) {
  const [displayNum, setDisplayNum] = useState('?');
  const [phase, setPhase] = useState('spinning'); // spinning | slowing | done

  useEffect(() => {
    let frame = 0;
    // Fast random spin for ~1.2s, then slow down to result
    const schedule = [];
    for (let i = 0; i < 20; i++) schedule.push({ delay: 60 + i * 12, fast: true });
    // Slow phase
    for (let i = 0; i < 6; i++) schedule.push({ delay: 60 + 20 * 12 + i * 120, fast: false });

    const timers = [];
    schedule.forEach(({ delay, fast }, idx) => {
      const t = setTimeout(() => {
        if (fast) {
          setDisplayNum(Math.floor(Math.random() * 6) + 1);
        } else {
          const remaining = schedule.length - 20 - idx;
          setDisplayNum(remaining > 0 ? Math.floor(Math.random() * 6) + 1 : result);
          if (remaining === 0) setPhase('done');
        }
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [result]);

  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onClose, 2000);
      return () => clearTimeout(t);
    }
  }, [phase, onClose]);

  const positions = [
    { top: '10%',  left: '50%' },  // 1 — top
    { top: '30%',  left: '85%' },  // 2 — top-right
    { top: '70%',  left: '85%' },  // 3 — bottom-right
    { top: '90%',  left: '50%' },  // 4 — bottom
    { top: '70%',  left: '15%' },  // 5 — bottom-left
    { top: '30%',  left: '15%' },  // 6 — top-left
  ];

  return (
    <div className="spinner-overlay" onClick={phase === 'done' ? onClose : undefined}>
      <div className="spinner-modal">
        <div className="spinner-title">Spinning…</div>

        <div className="spinner-wheel-wrap">
          {/* Static labeled segments */}
          {positions.map((pos, i) => (
            <div
              key={i + 1}
              className={`spinner-pip ${phase === 'done' && result === i + 1 ? 'active' : ''}`}
              style={{ top: pos.top, left: pos.left }}
            >
              {i + 1}
            </div>
          ))}

          {/* Fixed pointer — always at the top */}
          <div className="spinner-pointer-fixed">▼</div>

          {/* Big center number */}
          <div className={`spinner-center-num ${phase === 'done' ? 'landed' : 'rolling'}`}>
            {displayNum}
          </div>

          {/* Outer ring */}
          <div className="spinner-ring" />
        </div>

        {phase === 'done' && (
          <div className="spinner-result-label">
            Landed on <strong>{result}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
