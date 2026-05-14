import React, { useState, useEffect } from 'react';
import './HomeScreen.css';
import { HOME_BG_ART, HOME_HERO_ART } from '../assets/artUrls';

export default function HomeScreen({ error, onClearError, actions, audioEngine }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState('create');
  const [bgLoaded, setBgLoaded] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);

  useEffect(() => {
    const bg = new Image(); bg.src = HOME_BG_ART; bg.onload = () => setBgLoaded(true);
    const hero = new Image(); hero.src = HOME_HERO_ART; hero.onload = () => setHeroLoaded(true);
  }, []);

  const handleCreate = () => { if (!name.trim()) return; audioEngine.start(); actions.createRoom(name.trim()); };
  const handleJoin   = () => { if (!name.trim() || joinCode.length !== 4) return; audioEngine.start(); actions.joinRoom(joinCode.toUpperCase(), name.trim()); };

  return (
    <div className="home-screen">
      {/* AI atmospheric background */}
      <div className="home-bg-gradient" />
      {bgLoaded && <div className="home-bg-ai" style={{ backgroundImage: `url(${HOME_BG_ART})` }} />}

      <div className="home-layout">
        {/* Left — hero character */}
        <div className="home-hero-col">
          <div className={`home-hero-frame ${heroLoaded ? 'loaded' : ''}`}>
            {heroLoaded
              ? <img src={HOME_HERO_ART} className="home-hero-img" alt="Wizard" draggable={false} />
              : <div className="home-hero-placeholder" />
            }
          </div>
        </div>

        {/* Right — form */}
        <div className="home-form-col">
          <div className="home-brand">
            <div className="home-brand-eyebrow">A Wizard's Game</div>
            <h1 className="home-title">Poker for Wizards</h1>
            <p className="home-subtitle">Texas Hold'em meets arcane power</p>
          </div>

          <div className="home-card">
            <div className="home-tabs">
              <button className={`home-tab ${tab === 'create' ? 'active' : ''}`} onClick={() => setTab('create')}>
                Create Room
              </button>
              <button className={`home-tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>
                Join Room
              </button>
            </div>

            <div className="home-form">
              <label className="home-label">Your Name</label>
              <input
                className="home-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your wizard name..."
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? handleCreate() : handleJoin())}
              />

              {tab === 'join' && (
                <>
                  <label className="home-label">Room Code</label>
                  <input
                    className="home-input home-input-code"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="WXYZ"
                    maxLength={4}
                    onKeyDown={e => e.key === 'Enter' && handleJoin()}
                  />
                </>
              )}

              {error && <div className="home-error" onClick={onClearError}>{error}</div>}

              <button
                className="home-btn"
                onClick={tab === 'create' ? handleCreate : handleJoin}
                disabled={!name.trim() || (tab === 'join' && joinCode.length !== 4)}
              >
                {tab === 'create' ? 'Create Game' : 'Join Game'}
              </button>
            </div>
          </div>

          <div className="home-footer-stats">
            <span>3–8 Players</span>
            <span className="home-stat-dot" />
            <span>50+ Power Cards</span>
            <span className="home-stat-dot" />
            <span>Online Multiplayer</span>
          </div>
        </div>
      </div>
    </div>
  );
}
