// Procedural wizard audio — rich Web Audio API implementation

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._music = null;
    this._sfx = null;
    this._running = false;
    this._musicVolume = 0.12;
    this._sfxVolume = 0.5;
    this._musicNodes = [];
    this._melodyNodes = [];
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._master = this._mkGain(1);
      this._master.connect(this._ctx.destination);
      this._music = this._mkGain(this._musicVolume);
      this._music.connect(this._master);
      this._sfx = this._mkGain(this._sfxVolume);
      this._sfx.connect(this._master);
      this._running = true;
      this._buildAmbience();
    } catch (e) {
      console.warn('AudioContext unavailable', e);
    }
  }

  stop() {
    this._musicNodes.forEach(n => { try { n.stop(); } catch(_) {} });
    this._melodyNodes.forEach(n => { try { n.stop(); } catch(_) {} });
    this._musicNodes = [];
    this._melodyNodes = [];
    this._running = false;
  }

  play(name) {
    if (!this._running) return;
    switch (name) {
      case 'deal':    this._deal(); break;
      case 'chip':    this._chip(); break;
      case 'fold':    this._fold(); break;
      case 'spell':   this._spellCast(); break;
      case 'win':     this._win(); break;
      case 'check':   this._softClick(); break;
      case 'raise':   this._raiseSound(); break;
    }
  }

  onPhaseChange(phase) {
    if (!this._running) return;
    if (phase === 'showdown') this._win();
    if (phase === 'preflop_betting') this._newRound();
  }

  // ── Ambient Music ────────────────────────────────────────────

  _buildAmbience() {
    // Deep bass drone (A1 = 55Hz)
    this._addDrone(55,  0.055, 0.07);
    this._addDrone(110, 0.030, 0.11);
    this._addDrone(165, 0.015, 0.17); // E2 fifth

    // Shimmer layers
    this._addShimmer(440,  0.012, 0.18);
    this._addShimmer(880,  0.007, 0.27);
    this._addShimmer(1320, 0.004, 0.33);

    // Melodic layer
    this._scheduleHarmony();
  }

  _addDrone(freq, vol, lfoRate) {
    const osc  = this._mkOsc('sine', freq);
    const gain = this._mkGain(0);
    const lfo  = this._mkOsc('sine', lfoRate);
    const lg   = this._mkGain(vol * 0.4);
    lfo.connect(lg); lg.connect(gain.gain);
    osc.connect(gain); gain.connect(this._music);
    // Fade in
    gain.gain.setValueAtTime(0, this._ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, this._ctx.currentTime + 3);
    osc.start(); lfo.start();
    this._musicNodes.push(osc, lfo);
  }

  _addShimmer(freq, vol, lfoRate) {
    const osc  = this._mkOsc('sine', freq);
    const gain = this._mkGain(vol);
    const lfo  = this._mkOsc('sine', lfoRate + Math.random() * 0.1);
    const lg   = this._mkGain(vol * 0.6);
    lfo.connect(lg); lg.connect(gain.gain);
    osc.connect(gain); gain.connect(this._music);
    osc.start(); lfo.start();
    this._musicNodes.push(osc, lfo);
  }

  // Mystical chord melody in Am pentatonic — A C D E G
  _scheduleHarmony() {
    // Two-voice harmony for a richer feel
    const scale = [
      [220, 330], [246, 370], [261, 391], [293, 440],
      [329, 493], [349, 523], [391, 587], [440, 659],
      [493, 740], [523, 784],
    ];
    const noteDur = 2.2;
    const gap     = 0.4;
    let t = this._ctx.currentTime + 1;
    const seq = this._genMelody(scale, 20);

    for (const chord of seq) {
      if (chord) {
        chord.forEach((freq, i) => {
          this._scheduleNote(freq, t, noteDur, 0.028 - i * 0.006, 'triangle');
        });
      }
      t += noteDur + gap;
    }

    const total = seq.length * (noteDur + gap) * 1000;
    setTimeout(() => { if (this._running) this._scheduleHarmony(); }, total - 500);
  }

  _genMelody(scale, len) {
    const out = [];
    let idx = Math.floor(scale.length / 2);
    for (let i = 0; i < len; i++) {
      if (Math.random() < 0.18) { out.push(null); continue; }
      idx = Math.max(0, Math.min(scale.length - 1, idx + Math.round((Math.random() - 0.5) * 4)));
      out.push(scale[idx]);
    }
    return out;
  }

  _scheduleNote(freq, t, dur, vol, type = 'sine') {
    const osc  = this._mkOsc(type, freq);
    const gain = this._mkGain(0);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.12);
    gain.gain.setValueAtTime(vol, t + dur - 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this._music);
    osc.start(t); osc.stop(t + dur);
  }

  // ── Sound Effects ────────────────────────────────────────────

  // Card deal: paper whoosh + soft slap
  _deal() {
    const t = this._ctx.currentTime;
    // Filtered noise burst (whoosh)
    this._noiseShot(t,        0.05, 0.12, 'bandpass', 2200, 1.2);
    this._noiseShot(t + 0.08, 0.08, 0.07, 'bandpass', 900,  2.0);
    // Soft thud
    this._thud(t + 0.09, 80, 0.06, 0.08);
  }

  // Chip: satisfying layered clink
  _chip() {
    const t = this._ctx.currentTime;
    this._ping(t,        1320, 0.20, 0.09);
    this._ping(t + 0.01, 1760, 0.12, 0.06);
    this._ping(t + 0.03, 2200, 0.06, 0.04);
    this._noiseShot(t,   0.04, 0.05, 'highpass', 3000, 1.0);
  }

  // Raise: heavier chip drop with weight
  _raiseSound() {
    const t = this._ctx.currentTime;
    this._ping(t,        880,  0.25, 0.14);
    this._ping(t + 0.02, 1100, 0.15, 0.10);
    this._noiseShot(t,   0.06, 0.08, 'bandpass', 1200, 1.5);
    this._thud(t + 0.03, 60, 0.08, 0.12);
  }

  // Fold: dejected card slap + downward sweep
  _fold() {
    const t = this._ctx.currentTime;
    this._noiseShot(t,        0.10, 0.10, 'bandpass', 800,  1.5);
    this._sweep(t,       400, 150, 0.3, 0.06);
    this._thud(t + 0.05, 50,  0.04, 0.08);
  }

  // Soft click for check
  _softClick() {
    const t = this._ctx.currentTime;
    this._ping(t, 1600, 0.08, 0.05);
    this._noiseShot(t, 0.03, 0.04, 'bandpass', 2000, 2.0);
  }

  // Spell cast: dramatic magical ascending burst
  _spellCast() {
    const t = this._ctx.currentTime;
    // Rising arpeggio
    const freqs = [220, 330, 440, 659, 880, 1109, 1320];
    freqs.forEach((f, i) => {
      this._ping(t + i * 0.055, f, 0.18 - i * 0.015, 0.3 - i * 0.02);
    });
    // Magical shimmer noise at peak
    this._noiseShot(t + 0.35, 0.08, 0.25, 'bandpass', 4000, 0.8);
    // Ethereal hold note
    this._scheduleNote(1760, t + 0.3, 0.6, 0.04, 'sine');
    // Low power rumble
    this._sweep(t, 80, 40, 0.5, 0.05);
  }

  // Win: triumphant major chord progression
  _win() {
    const t = this._ctx.currentTime;
    // A major triad arpeggio: A4 C#5 E5 A5
    [[440,0],[554,0.1],[659,0.2],[880,0.35]].forEach(([f, d]) => {
      this._ping(t + d, f, 0.25, 0.6);
    });
    // Harmony
    [[220,0],[277,0.1],[329,0.2]].forEach(([f, d]) => {
      this._scheduleNote(f, t + d, 0.9, 0.04, 'triangle');
    });
    // Sparkle
    [1760, 2200, 2640].forEach((f, i) => {
      this._ping(t + 0.4 + i * 0.08, f, 0.10 - i * 0.02, 0.3);
    });
  }

  // New round subtle chord shift
  _newRound() {
    const t = this._ctx.currentTime;
    this._scheduleNote(220, t, 1.0, 0.025, 'triangle');
    this._scheduleNote(277, t + 0.05, 1.0, 0.018, 'triangle');
  }

  // ── Primitives ───────────────────────────────────────────────

  _ping(t, freq, vol, decay) {
    const osc  = this._mkOsc('sine', freq);
    const gain = this._mkGain(0);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain); gain.connect(this._sfx);
    osc.start(t); osc.stop(t + decay + 0.01);
  }

  _sweep(t, startF, endF, dur, vol) {
    const osc  = this._mkOsc('sine', startF);
    const gain = this._mkGain(vol);
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(endF, 1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this._sfx);
    osc.start(t); osc.stop(t + dur);
  }

  _thud(t, freq, vol, dur) {
    const osc  = this._mkOsc('sine', freq);
    const gain = this._mkGain(vol);
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.3, 20), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(this._sfx);
    osc.start(t); osc.stop(t + dur);
  }

  _noiseShot(t, vol, dur, filterType, filterFreq, Q) {
    const len    = Math.ceil(this._ctx.sampleRate * dur);
    const buf    = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src    = this._ctx.createBufferSource();
    src.buffer   = buf;
    const flt    = this._ctx.createBiquadFilter();
    flt.type     = filterType;
    flt.frequency.value = filterFreq;
    flt.Q.value  = Q;
    const gain   = this._mkGain(0);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(gain); gain.connect(this._sfx);
    src.start(t);
  }

  // ── Helpers ──────────────────────────────────────────────────

  _mkGain(v) {
    const g = this._ctx.createGain();
    g.gain.value = v;
    return g;
  }

  _mkOsc(type, freq) {
    const o = this._ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }
}
