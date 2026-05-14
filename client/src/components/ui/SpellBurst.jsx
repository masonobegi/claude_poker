import React, { useEffect, useState } from 'react';
import './SpellBurst.css';

const RUNES = ['✦', '✧', '⋆', '★', '✵', '⊹', '✺', '⁕'];
const COLORS = ['#cc88ff', '#88aaff', '#ffcc44', '#ff88cc', '#88ffcc'];

function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    rune: RUNES[Math.floor(Math.random() * RUNES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    angle: (i / count) * 360 + Math.random() * 30,
    distance: 60 + Math.random() * 80,
    size: 0.8 + Math.random() * 0.8,
    duration: 0.6 + Math.random() * 0.5,
    delay: Math.random() * 0.15,
  }));
}

export default function SpellBurst({ active, onDone }) {
  const [particles] = useState(() => makeParticles(14));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 900);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="spell-burst-overlay">
      <div className="spell-burst-center">
        {/* Screen flash */}
        <div className="spell-burst-flash" />
        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="spell-particle"
            style={{
              '--angle': `${p.angle}deg`,
              '--dist': `${p.distance}px`,
              '--color': p.color,
              '--size': p.size,
              '--dur': `${p.duration}s`,
              '--delay': `${p.delay}s`,
            }}
          >
            {p.rune}
          </div>
        ))}
        {/* Expanding ring */}
        <div className="spell-burst-ring" />
        <div className="spell-burst-ring spell-burst-ring-2" />
      </div>
    </div>
  );
}
