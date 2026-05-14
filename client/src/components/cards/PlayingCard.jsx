import React from 'react';
import './PlayingCard.css';

// SVG suit paths — hand-crafted bezier curves, not Unicode
const SUIT_PATHS = {
  H: {
    // Heart
    path: 'M50 80 C50 80 8 55 8 32 C8 18 18 10 29 10 C37 10 44 15 50 25 C56 15 63 10 71 10 C82 10 92 18 92 32 C92 55 50 80 50 80 Z',
    red: true,
    label: 'Hearts',
  },
  D: {
    // Diamond — sharp elegant rhombus
    path: 'M50 8 L88 50 L50 92 L12 50 Z',
    red: true,
    label: 'Diamonds',
  },
  C: {
    // Club — three lobes + stem
    path: null, // rendered with circles + rect
    red: false,
    label: 'Clubs',
  },
  S: {
    // Spade — inverted heart + stem
    path: 'M50 10 C50 10 8 48 8 65 C8 79 18 85 30 79 C39 74 48 63 50 55 L50 55 C52 63 61 74 70 79 C82 85 92 79 92 65 C92 48 50 10 50 10 Z',
    path2: 'M43 65 L57 65 L60 82 L40 82 Z', // stem
    red: false,
    label: 'Spades',
  },
};

function SuitSVG({ suitKey, size = 100, glowing }) {
  const s = SUIT_PATHS[suitKey] || SUIT_PATHS.S;
  const fill = s.red ? '#be1a1a' : '#1a1a3a';
  const glow = glowing ? (s.red ? 'drop-shadow(0 0 6px rgba(190,26,26,0.7))' : 'drop-shadow(0 0 6px rgba(26,26,58,0.5))') : undefined;

  if (suitKey === 'C') {
    // Club: three overlapping circles + stem + base
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} style={glow ? { filter: glow } : undefined}>
        <circle cx="50" cy="32" r="19" fill={fill}/>
        <circle cx="30" cy="58" r="19" fill={fill}/>
        <circle cx="70" cy="58" r="19" fill={fill}/>
        <rect x="44" y="66" width="12" height="18" rx="1" fill={fill}/>
        <rect x="36" y="80" width="28" height="8" rx="3" fill={fill}/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={glow ? { filter: glow } : undefined}>
      <path d={s.path} fill={fill}/>
      {s.path2 && <path d={s.path2} fill={fill}/>}
    </svg>
  );
}

// Elegant face card center art
function FaceArt({ rank, suitKey }) {
  const s = SUIT_PATHS[suitKey] || SUIT_PATHS.S;
  const primary = s.red ? '#be1a1a' : '#1a1a3a';
  const accent  = s.red ? '#8b0000' : '#0a0a20';

  if (rank === 'K') {
    return (
      <svg viewBox="0 0 80 110" className="face-svg">
        {/* Robe */}
        <path d="M15 110 L15 60 Q40 72 65 60 L65 110 Z" fill={primary} opacity="0.12"/>
        {/* Crown */}
        <path d="M22 38 L22 26 L28 34 L40 18 L52 34 L58 26 L58 38 Z" fill={primary}/>
        <circle cx="40" cy="17" r="4" fill="#f59e0b"/>
        <circle cx="22" cy="26" r="3" fill="#f59e0b"/>
        <circle cx="58" cy="26" r="3" fill="#f59e0b"/>
        {/* Head */}
        <ellipse cx="40" cy="50" rx="14" ry="15" fill="#fef3c7"/>
        <ellipse cx="40" cy="50" rx="14" ry="15" fill="none" stroke={primary} strokeWidth="0.8"/>
        {/* Eyes */}
        <ellipse cx="34" cy="48" rx="2" ry="2.5" fill={accent}/>
        <ellipse cx="46" cy="48" rx="2" ry="2.5" fill={accent}/>
        {/* Smile */}
        <path d="M34 57 Q40 62 46 57" stroke={primary} strokeWidth="1.2" fill="none"/>
        {/* Beard */}
        <path d="M28 56 Q40 70 52 56" fill="#94a3b8" opacity="0.5"/>
        {/* Scepter */}
        <line x1="58" y1="62" x2="68" y2="90" stroke={primary} strokeWidth="2.5" strokeLinecap="round"/>
        <polygon points="68,54 63,66 73,66" fill="#f59e0b"/>
        <circle cx="68" cy="53" r="4" fill="#f59e0b"/>
        {/* Mini suit */}
        <SuitSVG suitKey={suitKey} size={12}/>
      </svg>
    );
  }

  if (rank === 'Q') {
    return (
      <svg viewBox="0 0 80 110" className="face-svg">
        <path d="M12 110 L16 62 Q40 76 64 62 L68 110 Z" fill={primary} opacity="0.12"/>
        {/* Tiara */}
        <path d="M26 34 L26 24 L32 30 L40 16 L48 30 L54 24 L54 34 Z" fill={primary}/>
        <circle cx="40" cy="15" r="4" fill="#8b5cf6"/>
        <circle cx="26" cy="24" r="3" fill="#8b5cf6"/>
        <circle cx="54" cy="24" r="3" fill="#8b5cf6"/>
        {/* Hair */}
        <path d="M26 34 Q20 46 24 58" stroke="#92400e" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <path d="M54 34 Q60 46 56 58" stroke="#92400e" strokeWidth="4" fill="none" strokeLinecap="round"/>
        {/* Head */}
        <ellipse cx="40" cy="48" rx="14" ry="15" fill="#fef3c7"/>
        <ellipse cx="40" cy="48" rx="14" ry="15" fill="none" stroke={primary} strokeWidth="0.8"/>
        {/* Eyes + lips */}
        <ellipse cx="34" cy="46" rx="2" ry="2.5" fill={accent}/>
        <ellipse cx="46" cy="46" rx="2" ry="2.5" fill={accent}/>
        <path d="M35 55 Q40 59 45 55" stroke={primary} strokeWidth="1.5" fill="none"/>
        {/* Orb */}
        <circle cx="40" cy="80" r="10" fill="none" stroke={primary} strokeWidth="1.2"/>
        <circle cx="40" cy="80" r="10" fill="#ddd6fe" opacity="0.35"/>
        <ellipse cx="37" cy="77" rx="3" ry="2" fill="white" opacity="0.55"/>
      </svg>
    );
  }

  // Jack
  return (
    <svg viewBox="0 0 80 110" className="face-svg">
      <path d="M16 110 L16 62 Q40 72 64 62 L64 110 Z" fill={primary} opacity="0.12"/>
      {/* Jester hat */}
      <path d="M26 36 L26 24 L32 30 L40 10 L40 36 Z" fill={primary}/>
      <path d="M54 36 L54 24 L48 30 L40 10 L40 36 Z" fill={accent} opacity="0.7"/>
      <circle cx="40" cy="9" r="5" fill="#f59e0b"/>
      <circle cx="26" cy="24" r="3.5" fill="#f59e0b"/>
      <circle cx="54" cy="24" r="3.5" fill="#f59e0b"/>
      {/* Head */}
      <ellipse cx="40" cy="50" rx="14" ry="15" fill="#fef3c7"/>
      <ellipse cx="40" cy="50" rx="14" ry="15" fill="none" stroke={primary} strokeWidth="0.8"/>
      <ellipse cx="34" cy="48" rx="2" ry="2.5" fill={accent}/>
      <ellipse cx="46" cy="48" rx="2" ry="2.5" fill={accent}/>
      <path d="M34 58 Q40 62 46 58" stroke={primary} strokeWidth="1.2" fill="none"/>
      {/* Wand */}
      <line x1="60" y1="60" x2="72" y2="88" stroke={primary} strokeWidth="2.5" strokeLinecap="round"/>
      <polygon points="72,52 67,64 77,64" fill={accent}/>
      <circle cx="72" cy="51" r="5" fill="#8b5cf6"/>
      <circle cx="72" cy="51" r="3" fill="#c4b5fd"/>
    </svg>
  );
}

function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="card-back-svg" preserveAspectRatio="xMidYMid meet">
      {/* Base */}
      <rect x="0" y="0" width="100" height="140" rx="6" fill="#150535"/>
      {/* Outer border */}
      <rect x="3" y="3" width="94" height="134" rx="5" fill="none" stroke="#5b21b6" strokeWidth="1.2"/>
      {/* Inner border */}
      <rect x="7" y="7" width="86" height="126" rx="3" fill="none" stroke="#3b0764" strokeWidth="0.6"/>
      {/* Diamond lattice */}
      {Array.from({length:7},(_,row)=>Array.from({length:5},(_,col)=>(
        <path key={`${row}-${col}`}
          d={`M${10+col*17},${13+row*20} L${18+col*17},${23+row*20} L${10+col*17},${33+row*20} L${2+col*17},${23+row*20} Z`}
          fill="none" stroke="#6d28d9" strokeWidth="0.6" opacity="0.45"/>
      )))}
      {/* Center shield */}
      <path d="M50 46 L65 54 L65 75 Q65 88 50 96 Q35 88 35 75 L35 54 Z" fill="#1e0754" stroke="#7c3aed" strokeWidth="1"/>
      {/* Center emblem */}
      <text x="50" y="78" textAnchor="middle" fontSize="18" fill="#a78bfa" fontFamily="serif" dominantBaseline="middle">✦</text>
      {/* Corner stars */}
      {[[12,14],[88,14],[12,126],[88,126]].map(([x,y],i)=>(
        <text key={i} x={x} y={y} textAnchor="middle" fontSize="7" fill="#6d28d9" dominantBaseline="middle">✦</text>
      ))}
    </svg>
  );
}

export default function PlayingCard({ card, size = 'normal', faceDown = false, hidden = false, glowing = false }) {
  if (!card || hidden) return <div className={`playing-card empty ${size}`} />;

  if (faceDown) {
    return <div className={`playing-card back ${size}`}><CardBack /></div>;
  }

  const rank    = card.promotedRank || card.rank;
  const suitKey = card.suitOverride  || card.suit;
  const s       = SUIT_PATHS[suitKey] || SUIT_PATHS.S;
  const isWild  = card.isWild;
  const isFace  = ['J','Q','K'].includes(rank);
  const colorClass = s.red ? 'red' : 'black';

  // Center suit size in px (varies by card size)
  const suitSizePx = { small: 28, normal: 38, community: 52, large: 62 }[size] || 38;

  return (
    <div className={`playing-card ${size} ${colorClass} ${isWild ? 'wild' : ''} ${glowing ? 'glowing' : ''}`}>
      {/* Top-left corner */}
      <div className="card-corner tl">
        <span className="c-rank">{rank}</span>
        <span className="c-suit-small">
          <SuitSVG suitKey={suitKey} size={size === 'small' ? 9 : 11} />
        </span>
      </div>

      {/* Center */}
      <div className="card-center-area">
        {isFace
          ? <FaceArt rank={rank} suitKey={suitKey} />
          : <SuitSVG suitKey={suitKey} size={suitSizePx} glowing={glowing} />
        }
      </div>

      {/* Bottom-right corner (rotated 180°) */}
      <div className="card-corner br">
        <span className="c-rank">{rank}</span>
        <span className="c-suit-small">
          <SuitSVG suitKey={suitKey} size={size === 'small' ? 9 : 11} />
        </span>
      </div>

      {isWild            && <div className="card-badge wild-badge">WILD</div>}
      {card.promotedRank && <div className="card-badge promo-badge">↑</div>}
      {card.suitOverride && <div className="card-badge suit-badge">✦</div>}
    </div>
  );
}
