import React, { useState } from 'react';
import { AVATAR_ART } from '../../assets/artUrls';
import './AvatarImage.css';

const BOT_NAMES = new Set(['Merlin','Gandalf','Dumbledore','Morgana','Saruman','Circe','Hex','Vex']);

export default function AvatarImage({ name, isBot, size = 48, className = '' }) {
  const [failed, setFailed] = useState(false);

  const url = isBot
    ? (AVATAR_ART[name] || AVATAR_ART.bot)
    : AVATAR_ART.human;

  const initials = (name || '?').slice(0, 2).toUpperCase();

  return (
    <div
      className={`avatar-wrap ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
    >
      {!failed
        ? <img
            src={url}
            className="avatar-img"
            onError={() => setFailed(true)}
            alt={name}
            draggable={false}
          />
        : <div className="avatar-fallback">{initials}</div>
      }
    </div>
  );
}
