import React, { useState, useEffect } from 'react';
import './SpinnerModal.css';

export default function SpinnerModal({ result, onClose }) {
  const [spinning, setSpinning] = useState(true);
  const [displayNum, setDisplayNum] = useState(1);

  useEffect(() => {
    let count = 0;
    const maxSpins = 18;
    const interval = setInterval(() => {
      setDisplayNum(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= maxSpins) {
        clearInterval(interval);
        setDisplayNum(result);
        setSpinning(false);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [result]);

  useEffect(() => {
    if (!spinning) {
      const t = setTimeout(onClose, 1800);
      return () => clearTimeout(t);
    }
  }, [spinning, onClose]);

  const segments = [1, 2, 3, 4, 5, 6];

  return (
    <div className="spinner-overlay" onClick={spinning ? undefined : onClose}>
      <div className="spinner-modal">
        <div className="spinner-title">🎰 Spinning...</div>
        <div className={`spinner-wheel ${spinning ? 'spinning' : 'landed'}`}>
          <div className="spinner-pointer">▼</div>
          <div className="spinner-disc">
            {segments.map(n => (
              <div
                key={n}
                className={`spinner-segment ${!spinning && displayNum === n ? 'active' : ''}`}
                style={{ transform: `rotate(${(n - 1) * 60}deg)` }}
              >
                <span className="spinner-num" style={{ transform: `rotate(30deg)` }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        {!spinning && (
          <div className="spinner-result">
            Result: <strong>{result}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
