import React, { useState } from 'react';
import './PlayingCard.css';
import { FACE_ART, CARD_BACK_ART } from '../../assets/artUrls';

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

// AI-generated face card art with SVG fallback
function FaceArt({ rank, suitKey }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = FACE_ART[rank] || FACE_ART.K;
  const s = SUIT_PATHS[suitKey] || SUIT_PATHS.S;
  const primary = s.red ? '#be1a1a' : '#1a1a3a';

  if (!failed) {
    return (
      <div className="face-art-wrap">
        {!loaded && <div className="face-art-placeholder">{rank}</div>}
        <img
          src={url}
          className={`face-art-img ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          alt={rank}
          draggable={false}
        />
      </div>
    );
  }

  // SVG fallback if image fails
  return (
    <svg viewBox="0 0 60 80" className="face-svg">
      <rect x="5" y="5" width="50" height="70" rx="4" fill={primary} opacity="0.08"/>
      <text x="30" y="45" textAnchor="middle" dominantBaseline="middle"
            fontSize="32" fontWeight="900" fill={primary} fontFamily="Georgia, serif">{rank}</text>
      <SuitSVG suitKey={suitKey} size={14}/>
    </svg>
  );
}

function CardBack() {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!failed) {
    return (
      <div className="card-back-wrap">
        {!loaded && <div className="card-back-placeholder" />}
        <img
          src={CARD_BACK_ART}
          className={`card-back-img ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          alt="card back"
          draggable={false}
        />
      </div>
    );
  }

  // SVG fallback
  return (
    <svg viewBox="0 0 100 140" className="card-back-svg" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="100" height="140" rx="6" fill="#150535"/>
      <rect x="3" y="3" width="94" height="134" rx="5" fill="none" stroke="#5b21b6" strokeWidth="1.2"/>
      {Array.from({length:7},(_,row)=>Array.from({length:5},(_,col)=>(
        <path key={`${row}-${col}`}
          d={`M${10+col*17},${13+row*20} L${18+col*17},${23+row*20} L${10+col*17},${33+row*20} L${2+col*17},${23+row*20} Z`}
          fill="none" stroke="#6d28d9" strokeWidth="0.6" opacity="0.45"/>
      )))}
      <text x="50" y="78" textAnchor="middle" fontSize="18" fill="#a78bfa" fontFamily="serif" dominantBaseline="middle">✦</text>
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
