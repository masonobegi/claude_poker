import React from 'react';
import './PlayingCard.css';

// Standard suit characters — properly styled via CSS color, NOT emoji
const SUIT = {
  H: { char: '♥', red: true,  name: 'Hearts'   },
  D: { char: '♦', red: true,  name: 'Diamonds'  },
  C: { char: '♣', red: false, name: 'Clubs'     },
  S: { char: '♠', red: false, name: 'Spades'    },
};

// Standard pip positions [top%, left%] — matches real playing card layouts
const PIPS = {
  '2':  [[20,50],[80,50]],
  '3':  [[20,50],[50,50],[80,50]],
  '4':  [[22,30],[22,70],[78,30],[78,70]],
  '5':  [[22,30],[22,70],[50,50],[78,30],[78,70]],
  '6':  [[22,30],[22,70],[50,30],[50,70],[78,30],[78,70]],
  '7':  [[18,30],[18,70],[35,50],[52,30],[52,70],[82,30],[82,70]],
  '8':  [[18,30],[18,70],[34,50],[50,30],[50,70],[66,50],[82,30],[82,70]],
  '9':  [[18,28],[18,72],[38,28],[38,72],[59,50],[62,28],[62,72],[82,28],[82,72]],
  '10': [[17,28],[17,72],[33,50],[47,28],[47,72],[53,28],[53,72],[68,50],[83,28],[83,72]],
};

// SVG face card artwork — wizard-themed illustrations
function KingArt({ suit, red }) {
  const c = red ? '#b91c1c' : '#1e1b4b';
  return (
    <svg viewBox="0 0 54 76" className="face-art">
      {/* Robe */}
      <path d="M12 76 L10 44 Q27 52 44 44 L42 76 Z" fill={c} opacity="0.15"/>
      {/* Body */}
      <rect x="16" y="40" width="22" height="28" rx="4" fill={c} opacity="0.2"/>
      {/* Head */}
      <ellipse cx="27" cy="32" rx="10" ry="11" fill="#fde68a"/>
      <ellipse cx="27" cy="32" rx="10" ry="11" fill="none" stroke={c} strokeWidth="0.8"/>
      {/* Crown */}
      <path d="M17 24 L17 18 L21 22 L27 15 L33 22 L37 18 L37 24 Z" fill={c}/>
      <circle cx="27" cy="15" r="2" fill="#fbbf24"/>
      <circle cx="17" cy="18" r="1.5" fill="#fbbf24"/>
      <circle cx="37" cy="18" r="1.5" fill="#fbbf24"/>
      {/* Face features */}
      <ellipse cx="23" cy="30" rx="1.2" ry="1.5" fill={c}/>
      <ellipse cx="31" cy="30" rx="1.2" ry="1.5" fill={c}/>
      <path d="M23 36 Q27 39 31 36" stroke={c} strokeWidth="0.8" fill="none"/>
      {/* Beard */}
      <path d="M19 35 Q27 46 35 35" fill="#d1d5db" opacity="0.7"/>
      {/* Scepter */}
      <line x1="38" y1="42" x2="46" y2="68" stroke={c} strokeWidth="2"/>
      <polygon points="46,36 43,44 49,44" fill="#fbbf24"/>
      {/* Suit symbol */}
      <text x="27" y="74" textAnchor="middle" fontSize="7" fill={c} opacity="0.5" fontFamily="serif">{suit}</text>
    </svg>
  );
}

function QueenArt({ suit, red }) {
  const c = red ? '#b91c1c' : '#1e1b4b';
  return (
    <svg viewBox="0 0 54 76" className="face-art">
      {/* Gown */}
      <path d="M8 76 L12 44 Q27 54 42 44 L46 76 Z" fill={c} opacity="0.15"/>
      {/* Body */}
      <ellipse cx="27" cy="50" rx="12" ry="16" fill={c} opacity="0.18"/>
      {/* Head */}
      <ellipse cx="27" cy="30" rx="10" ry="11" fill="#fde68a"/>
      <ellipse cx="27" cy="30" rx="10" ry="11" fill="none" stroke={c} strokeWidth="0.8"/>
      {/* Tiara */}
      <path d="M18 22 L18 17 L22 20 L27 14 L32 20 L36 17 L36 22 Z" fill={c}/>
      <circle cx="27" cy="14" r="2.5" fill="#a78bfa"/>
      <circle cx="18" cy="17" r="1.5" fill="#a78bfa"/>
      <circle cx="36" cy="17" r="1.5" fill="#a78bfa"/>
      {/* Hair */}
      <path d="M17 22 Q14 30 17 38" stroke="#92400e" strokeWidth="2.5" fill="none"/>
      <path d="M37 22 Q40 30 37 38" stroke="#92400e" strokeWidth="2.5" fill="none"/>
      {/* Face */}
      <ellipse cx="23" cy="28" rx="1.2" ry="1.5" fill={c}/>
      <ellipse cx="31" cy="28" rx="1.2" ry="1.5" fill={c}/>
      <path d="M23 35 Q27 37.5 31 35" stroke={c} strokeWidth="0.8" fill="none"/>
      {/* Crystal orb */}
      <circle cx="27" cy="58" r="6" fill="none" stroke={c} strokeWidth="1"/>
      <circle cx="27" cy="58" r="6" fill="#ddd6fe" opacity="0.4"/>
      <circle cx="25" cy="56" r="1.5" fill="white" opacity="0.6"/>
      <text x="27" y="74" textAnchor="middle" fontSize="7" fill={c} opacity="0.5" fontFamily="serif">{suit}</text>
    </svg>
  );
}

function JackArt({ suit, red }) {
  const c = red ? '#b91c1c' : '#1e1b4b';
  return (
    <svg viewBox="0 0 54 76" className="face-art">
      {/* Tunic */}
      <path d="M14 76 L14 44 Q27 50 40 44 L40 76 Z" fill={c} opacity="0.18"/>
      {/* Body */}
      <rect x="16" y="40" width="22" height="24" rx="3" fill={c} opacity="0.15"/>
      {/* Head */}
      <ellipse cx="27" cy="30" rx="10" ry="11" fill="#fde68a"/>
      <ellipse cx="27" cy="30" rx="10" ry="11" fill="none" stroke={c} strokeWidth="0.8"/>
      {/* Jester hat */}
      <path d="M17 23 L17 14 L22 20 L27 8 L27 22 Z" fill={c}/>
      <path d="M37 23 L37 14 L32 20 L27 8 L27 22 Z" fill={c} opacity="0.7"/>
      <circle cx="27" cy="7" r="3" fill="#fbbf24"/>
      <circle cx="17" cy="14" r="2" fill="#fbbf24"/>
      <circle cx="37" cy="14" r="2" fill="#fbbf24"/>
      {/* Face */}
      <ellipse cx="23" cy="28" rx="1.2" ry="1.5" fill={c}/>
      <ellipse cx="31" cy="28" rx="1.2" ry="1.5" fill={c}/>
      <path d="M23 35 Q27 38 31 35" stroke={c} strokeWidth="0.8" fill="none"/>
      {/* Wand */}
      <line x1="38" y1="40" x2="48" y2="68" stroke={c} strokeWidth="1.5"/>
      <polygon points="48,34 45,42 51,42" fill={c}/>
      <circle cx="48" cy="33" r="2.5" fill="#a78bfa"/>
      <text x="27" y="74" textAnchor="middle" fontSize="7" fill={c} opacity="0.5" fontFamily="serif">{suit}</text>
    </svg>
  );
}

function AceArt({ char, red }) {
  const c = red ? '#b91c1c' : '#1e1b4b';
  return (
    <svg viewBox="0 0 54 76" className="face-art ace-art">
      {/* Decorative ring */}
      <circle cx="27" cy="38" r="18" fill="none" stroke={c} strokeWidth="0.6" opacity="0.3"/>
      <circle cx="27" cy="38" r="14" fill="none" stroke={c} strokeWidth="0.4" opacity="0.2"/>
      {/* Large suit */}
      <text x="27" y="50" textAnchor="middle" dominantBaseline="middle"
            fontSize="28" fill={c} fontFamily="serif" style={{filter:`drop-shadow(0 0 3px ${c}40)`}}>
        {char}
      </text>
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 54 76" className="card-back-svg">
      <rect x="0" y="0" width="54" height="76" rx="4" fill="#1e0a40"/>
      {/* Ornate border */}
      <rect x="2" y="2" width="50" height="72" rx="3" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
      <rect x="4" y="4" width="46" height="68" rx="2" fill="none" stroke="#4c1d95" strokeWidth="0.4"/>
      {/* Diamond lattice */}
      {Array.from({length:6},(_,row) => Array.from({length:4},(_,col) => (
        <path key={`${row}-${col}`}
          d={`M${8+col*12},${8+row*12} L${14+col*12},${14+row*12} L${8+col*12},${20+row*12} L${2+col*12},${14+row*12} Z`}
          fill="none" stroke="#6d28d9" strokeWidth="0.5" opacity="0.5"/>
      )))}
      {/* Center emblem */}
      <circle cx="27" cy="38" r="9" fill="#2d1b69"/>
      <circle cx="27" cy="38" r="9" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
      <text x="27" y="43" textAnchor="middle" fontSize="12" fill="#a78bfa" fontFamily="serif">✦</text>
      {/* Corner ornaments */}
      {[[6,6],[48,6],[6,70],[48,70]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="1.5" fill="#7c3aed" opacity="0.6"/>
      ))}
    </svg>
  );
}

export default function PlayingCard({ card, size = 'normal', faceDown = false, hidden = false, glowing = false }) {
  if (!card || hidden) return <div className={`playing-card empty ${size}`} />;

  if (faceDown) {
    return (
      <div className={`playing-card back ${size}`}>
        <CardBack />
      </div>
    );
  }

  const rank = card.promotedRank || card.rank;
  const suitKey = card.suitOverride || card.suit;
  const { char, red } = SUIT[suitKey] || SUIT.S;
  const isWild = card.isWild;
  const pips = PIPS[rank];
  const isFace = ['J','Q','K'].includes(rank);
  const isAce  = rank === 'A';
  const colorClass = red ? 'red' : 'black';

  return (
    <div className={`playing-card ${size} ${colorClass} ${isWild ? 'wild' : ''} ${glowing ? 'glowing' : ''}`}>
      {/* Top-left corner */}
      <div className="card-corner tl">
        <span className="c-rank">{rank}</span>
        <span className="c-suit">{char}</span>
      </div>

      {/* Center face / pips */}
      <div className="card-center-area">
        {isFace && rank === 'K' && <KingArt  suit={char} red={red} />}
        {isFace && rank === 'Q' && <QueenArt suit={char} red={red} />}
        {isFace && rank === 'J' && <JackArt  suit={char} red={red} />}
        {isAce  && <AceArt char={char} red={red} />}
        {pips && (
          <div className="pip-grid">
            {pips.map(([t,l], i) => (
              <span key={i} className="pip" style={{ top:`${t}%`, left:`${l}%` }}>{char}</span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="card-corner br">
        <span className="c-rank">{rank}</span>
        <span className="c-suit">{char}</span>
      </div>

      {isWild && <div className="wild-badge">WILD</div>}
      {card.promotedRank && <div className="promo-badge">↑</div>}
      {card.suitOverride && <div className="suit-override-badge">✦</div>}
    </div>
  );
}
