// Procedural wizard audio — no external files needed

export class AudioEngine {
  constructor() {
    this._ctx = null;
    this._musicNodes = [];
    this._musicGain = null;
    this._sfxGain = null;
    this._running = false;
    this._musicEnabled = true;
    this._sfxEnabled = true;
  }

  start() {
    if (this._running) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = 0.10;
      this._musicGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 0.4;
      this._sfxGain.connect(this._ctx.destination);

      this._running = true;
      this._startAmbientMusic();
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
    }
  }

  stop() {
    for (const n of this._musicNodes) {
      try { n.stop(); } catch (_) {}
    }
    this._musicNodes = [];
    this._running = false;
  }

  setMusicVolume(v) {
    if (this._musicGain) this._musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  // Public: play a named sound effect
  play(name) {
    if (!this._running || !this._sfxEnabled) return;
    switch (name) {
      case 'deal':    this._playDeal(); break;
      case 'chip':    this._playChip(); break;
      case 'fold':    this._playFold(); break;
      case 'spell':   this._playSpell(); break;
      case 'win':     this._playWin(); break;
      default: break;
    }
  }

  onPhaseChange(phase) {
    if (!this._running) return;
    if (phase === 'showdown') this.play('win');
  }

  // ── Ambient Music ──────────────────────────────────────────────────────────

  _startAmbientMusic() {
    if (!this._ctx) return;

    // Low drone — deep tonic
    this._addDrone(55, 0.08, 8.0);     // A1
    this._addDrone(110, 0.05, 11.0);   // A2

    // Slow melody loop using pentatonic scale
    const pentatonic = [220, 247, 277, 330, 370, 440, 494, 554, 659];
    this._scheduleMelody(pentatonic);

    // Shimmer — high-frequency oscillator with tremolo
    this._addShimmer(880, 0.02);
    this._addShimmer(1760, 0.01);
  }

  _addDrone(freq, vol, lfoRate) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const lfo = this._ctx.createOscillator();
    const lfoGain = this._ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol;
    lfo.frequency.value = lfoRate;
    lfoGain.gain.value = vol * 0.3;

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this._musicGain);

    osc.start();
    lfo.start();
    this._musicNodes.push(osc, lfo);
  }

  _addShimmer(freq, vol) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const tremolo = this._ctx.createOscillator();
    const tremGain = this._ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol;
    tremolo.frequency.value = 0.25 + Math.random() * 0.5;
    tremGain.gain.value = vol * 0.5;

    tremolo.connect(tremGain);
    tremGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this._musicGain);

    osc.start();
    tremolo.start();
    this._musicNodes.push(osc, tremolo);
  }

  _scheduleMelody(scale) {
    if (!this._ctx) return;
    const noteLen = 1.8;
    const gap = 0.3;
    let time = this._ctx.currentTime + 0.5;

    const melody = this._generateMelody(scale, 24);

    for (const freq of melody) {
      if (freq) this._scheduleNote(freq, time, noteLen, 0.04);
      time += noteLen + gap;
    }

    // Loop after all notes play
    const totalDuration = melody.length * (noteLen + gap) * 1000;
    setTimeout(() => {
      if (this._running) this._scheduleMelody(scale);
    }, totalDuration);
  }

  _generateMelody(scale, length) {
    const notes = [];
    let idx = Math.floor(scale.length / 2);
    for (let i = 0; i < length; i++) {
      if (Math.random() < 0.15) {
        notes.push(null); // rest
      } else {
        const delta = Math.round((Math.random() - 0.5) * 4);
        idx = Math.max(0, Math.min(scale.length - 1, idx + delta));
        notes.push(scale[idx]);
      }
    }
    return notes;
  }

  _scheduleNote(freq, time, duration, vol) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this._musicGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  // ── Sound Effects ──────────────────────────────────────────────────────────

  _playDeal() {
    this._noise(0.06, 0.08, 'bandpass', 3000, 0.5);
  }

  _playChip() {
    this._ping(880, 0.15, 0.12);
    setTimeout(() => this._ping(1100, 0.08, 0.08), 30);
  }

  _playFold() {
    this._sweep(440, 220, 0.4, 0.12);
  }

  _playSpell() {
    // Rising magical arpeggio
    const freqs = [440, 554, 659, 880, 1109];
    freqs.forEach((f, i) => {
      setTimeout(() => this._ping(f, 0.12, 0.25), i * 60);
    });
    setTimeout(() => this._sweep(880, 1760, 0.3, 0.08), freqs.length * 60);
  }

  _playWin() {
    const freqs = [330, 415, 495, 660];
    freqs.forEach((f, i) => {
      setTimeout(() => this._ping(f, 0.2, 0.4), i * 100);
    });
  }

  _ping(freq, vol, decay) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + decay);
  }

  _sweep(startFreq, endFreq, duration, vol) {
    if (!this._ctx) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  _noise(vol, duration, filterType, filterFreq, Q) {
    if (!this._ctx) return;
    const bufferSize = this._ctx.sampleRate * duration;
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this._ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    filter.Q.value = Q;

    const gain = this._ctx.createGain();
    const now = this._ctx.currentTime;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfxGain);
    source.start(now);
  }
}
