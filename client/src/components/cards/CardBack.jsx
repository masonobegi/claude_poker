import React from 'react';
import './PlayingCard.css';

export default function CardBack({ size = 'normal' }) {
  return (
    <div className={`playing-card back ${size}`}>
      <div className="card-back-pattern">✦</div>
    </div>
  );
}
