import React, { useEffect, useState } from 'react';
import './SpellBurst.css';

const RUNES = ['✦', '✧', '⋆', '★', '✵', '⊹', '✺', '⁕', '◆', '◇', '❋', '❊'];
const COLORS = ['#cc88ff', '#88aaff', '#ffcc44', '#ff88cc', '#88ffcc', '#ff6688', '#44ffcc', '#ffaa44'];

function makeParticles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    rune: RUNES[Math.floor(Math.random() * RUNES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    angle: (i / count) * 360 + Math.random() * 20,
    distance: 80 + Math.random() * 160,
    size: 0.9 + Math.random() * 1.2,
    duration: 0.65 + Math.random() * 0.55,
    delay: Math.random() * 0.12,
  }));
}

export default function SpellBurst({ active, onDone }) {
  const [particles] = useState(() => makeParticles(28));
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 1100);
    return () => clearTimeout(t);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="spell-burst-overlay">
      <div className="spell-burst-center">
        <div className="spell-burst-flash" />
        <div className="spell-burst-flash spell-burst-flash-2" />
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
        <div className="spell-burst-ring" />
        <div className="spell-burst-ring spell-burst-ring-2" />
        <div className="spell-burst-ring spell-burst-ring-3" />
        <div className="spell-burst-ring spell-burst-ring-4" />
        <div className="spell-burst-core" />
      </div>
    </div>
  );
}
