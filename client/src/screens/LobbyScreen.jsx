import React, { useEffect, useState } from 'react';
import { LOBBY_BG_ART } from '../assets/artUrls';
import AvatarImage from '../components/player/AvatarImage';
import './LobbyScreen.css';

export default function LobbyScreen({ lobbyState, playerId, roomCode, actions }) {
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    const img = new Image(); img.src = LOBBY_BG_ART; img.onload = () => setBgLoaded(true);
  }, []);

  if (!lobbyState) return <div className="lobby-loading">Connecting...</div>;

  const isHost = lobbyState.hostId === playerId;
  const canStart = lobbyState.players.length >= 2;
  const canAddBot = lobbyState.players.length < 8;

  return (
    <div className="lobby-screen">
      <div className="lobby-bg-base" />
      {bgLoaded && <div className="lobby-bg-ai" style={{ backgroundImage: `url(${LOBBY_BG_ART})` }} />}

      <div className="lobby-content">
        {/* Header */}
        <div className="lobby-header">
          <div className="lobby-brand">Poker for Wizards</div>
          <div className="lobby-code-block">
            <span className="lobby-code-label">Room Code</span>
            <span className="lobby-code">{roomCode}</span>
            <button
              className="lobby-copy-btn"
              onClick={() => navigator.clipboard.writeText(roomCode)}
              title="Copy code"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Player list */}
        <div className="lobby-players">
          <div className="lobby-section-title">
            Players — {lobbyState.players.length}/8
          </div>
          <div className="lobby-player-list">
            {lobbyState.players.map(p => (
              <div key={p.id} className={`lobby-player ${p.id === playerId ? 'me' : ''}`}>
                <AvatarImage name={p.name} isBot={p.isBot} size={44} />
                <div className="lobby-player-info">
                  <div className="lobby-player-name">
                    {p.name}
                    {p.id === playerId && <span className="lobby-you-badge">You</span>}
                    {p.id === lobbyState.hostId && <span className="lobby-host-badge">Host</span>}
                  </div>
                  <div className="lobby-player-type">{p.isBot ? 'AI Opponent' : 'Human Player'}</div>
                </div>
                {isHost && p.isBot && (
                  <button className="lobby-remove-bot" onClick={() => actions.removeBot(p.id)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {isHost && canAddBot && (
            <button className="lobby-btn lobby-btn-secondary" onClick={actions.addBot}>
              Add AI Player
            </button>
          )}
          {isHost
            ? <button className="lobby-btn lobby-btn-primary" onClick={actions.startGame} disabled={!canStart}>
                {canStart ? 'Start Game' : 'Need 2+ players'}
              </button>
            : <div className="lobby-waiting">
                <div className="lobby-waiting-dot" />
                Waiting for host to start…
              </div>
          }
        </div>

        {/* Info */}
        <div className="lobby-info">
          <div className="lobby-info-item"><span className="lobby-info-val">50,000</span> starting chips</div>
          <div className="lobby-info-item"><span className="lobby-info-val">1,000</span> big blind</div>
          <div className="lobby-info-item"><span className="lobby-info-val">50+</span> power cards</div>
        </div>
      </div>
    </div>
  );
}
