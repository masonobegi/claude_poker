import React from 'react';
import PlayingCard from '../cards/PlayingCard';
import CardBack from '../cards/CardBack';
import './CommunityCards.css';

export default function CommunityCards({ cards, phase }) {
  // Show placeholders for missing community cards
  const slots = [0, 1, 2, 3, 4];
  return (
    <div className="community-cards">
      {slots.map(i => {
        const card = cards[i];
        if (!card) {
          // Gray placeholder
          return <div key={i} className="community-slot empty" />;
        }
        return (
          <div key={i} className="community-slot" style={{ animationDelay: `${i * 0.08}s` }}>
            <PlayingCard card={card} size="community" />
          </div>
        );
      })}
    </div>
  );
}
