/* Suit sounds. Mars air is about 1% as dense as Earth's, so outside sounds are faint and muffled (Perseverance's
   microphones confirmed this). What an astronaut hears is mostly the suit: breathing, fans, and footsteps carried
   up through the boots. */
export class SuitAudio {
  constructor(volume = 1) { this.on = true; this.vol = volume; }
  setVolume(v) { this.vol = v; if (this.master) this.master.gain.value = this.on ? 0.55 * v : 0; }
  start() {
    try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    const c = this.ctx; if (c.state === "suspended") c.resume();
    if (this.master) return;
    this.master = c.createGain(); this.master.gain.value = 0.55 * this.vol; this.master.connect(c.destination);
    const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = noise.getChannelData(0); let b = 0;
    for (let i = 0; i < d.length; i++) { b = 0.98 * b + 0.02 * (Math.random() * 2 - 1); d[i] = b * 6; }
    this.noise = noise;
    // ventilation fan hum
    const fan = c.createBufferSource(); fan.buffer = noise; fan.loop = true; const fl = c.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = 180; fl.Q.value = 0.8; const fg = c.createGain(); fg.gain.value = 0.05; fan.connect(fl).connect(fg).connect(this.master); fan.start();
    // breathing: filtered noise with a slow 4-second cycle
    const br = c.createBufferSource(); br.buffer = noise; br.loop = true; const bf = c.createBiquadFilter(); bf.type = "bandpass"; bf.frequency.value = 900; bf.Q.value = 0.6; const bg = c.createGain(); bg.gain.value = 0; br.connect(bf).connect(bg).connect(this.master); br.start();
    this.breath = bg;
    const cycle = () => { if (!this.ctx) return; const t = c.currentTime; bg.gain.cancelScheduledValues(t); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.07, t + 1.2); bg.gain.linearRampToValueAtTime(0.0, t + 1.9); bg.gain.linearRampToValueAtTime(0.045, t + 2.5); bg.gain.linearRampToValueAtTime(0, t + 3.6); setTimeout(cycle, 4000); };
    cycle();
  }
  step(strength) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220; const g = c.createGain(), t = c.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(Math.min(0.5, 0.18 * strength), t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.25);
  }
  click() {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.frequency.value = 1400; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
  }
  toggle() { this.on = !this.on; if (this.master) this.master.gain.value = this.on ? 0.55 * this.vol : 0; return this.on; }
}
