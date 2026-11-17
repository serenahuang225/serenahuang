/**
 * Every sound in the cave is synthesized with the Web Audio API — no files to
 * download. Browsers only allow audio after a click or key press, so the
 * engine starts on the first one.
 */

const MUTE_KEY = "underground-muted-v1";

type Ctx = AudioContext;

class SoundEngine {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private amb!: GainNode;
  private underwaterFilter!: BiquadFilterNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private rollGain!: GainNode;
  private rollFilter!: BiquadFilterNode;
  private brushGain!: GainNode;
  private brushFilter!: BiquadFilterNode;
  private fallsGain!: GainNode;
  private swimGain!: GainNode;
  private flyGain!: GainNode;
  private timers: number[] = [];
  muted = false;
  private listeners = new Set<() => void>();

  constructor() {
    try {
      this.muted = typeof window !== "undefined" && window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  get started() {
    return !!this.ctx;
  }

  /** Call from a user gesture. Safe to call many times. */
  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.underwaterFilter = ctx.createBiquadFilter();
    this.underwaterFilter.type = "lowpass";
    this.underwaterFilter.frequency.value = 18000;
    this.underwaterFilter.connect(this.master);
    this.master.connect(ctx.destination);

    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.8;
    this.sfx.connect(this.underwaterFilter);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.7;
    this.amb.connect(this.underwaterFilter);

    // a cave-sized echo, made from decaying noise
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.underwaterFilter);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // continuous layers, silent until something sets them
    const loop = (filterType: BiquadFilterType, freq: number, q: number, dest: AudioNode) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = filterType;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(dest);
      src.start();
      return { f, g };
    };
    ({ f: this.rollFilter, g: this.rollGain } = loop("lowpass", 260, 0.7, this.sfx));
    ({ f: this.brushFilter, g: this.brushGain } = loop("bandpass", 2600, 0.9, this.sfx));
    ({ g: this.fallsGain } = loop("lowpass", 900, 0.5, this.amb));
    ({ g: this.swimGain } = loop("bandpass", 500, 1.2, this.sfx));
    ({ g: this.flyGain } = loop("bandpass", 700, 0.6, this.sfx));

    this.startAmbience();
    this.emit();
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      window.localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      // ignore
    }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    this.emit();
  }

  // ------------------------------------------------------------ ambience

  private startAmbience() {
    const ctx = this.ctx!;
    // the faintest breath of cave air, low and soft rather than hissy
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = "lowpass";
    wf.frequency.value = 260;
    wf.Q.value = 0.5;
    const wg = ctx.createGain();
    wg.gain.value = 0.016;
    const wl = ctx.createOscillator();
    wl.frequency.value = 0.07;
    const wlg = ctx.createGain();
    wlg.gain.value = 0.009;
    wl.connect(wlg).connect(wg.gain);
    wl.start();
    wind.connect(wf).connect(wg).connect(this.amb);
    wind.start();

    // water drips and far-off chimes, at gentle random intervals
    const drip = () => {
      this.plink(900 + Math.random() * 1300, 0.05 + Math.random() * 0.04);
      this.timers.push(window.setTimeout(drip, 1400 + Math.random() * 4200));
    };
    const chime = () => {
      const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        this.bell(f, 0.025, 2.6, this.amb, i * 0.35);
      }
      this.timers.push(window.setTimeout(chime, 7000 + Math.random() * 9000));
    };
    this.timers.push(window.setTimeout(drip, 1200));
    this.timers.push(window.setTimeout(chime, 4000));
  }

  /** Called every frame with the live state of the world. */
  update(p: {
    speed: number;
    grounded: boolean;
    brush: number;
    underwater: boolean;
    swimming: boolean;
    flying: boolean;
    fallsDistance: number;
  }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const rolling = p.grounded && !p.swimming ? Math.min(p.speed / 11, 1) : 0;
    this.rollGain.gain.setTargetAtTime(rolling * 0.05, t, 0.08);
    this.rollFilter.frequency.setTargetAtTime(160 + p.speed * 32, t, 0.1);
    this.brushGain.gain.setTargetAtTime(Math.min(p.brush, 1) * 0.012, t, 0.06);
    this.brushFilter.frequency.setTargetAtTime(2000 + Math.random() * 1400, t, 0.05);
    const falls = Math.max(0, 1 - p.fallsDistance / 45);
    this.fallsGain.gain.setTargetAtTime(falls * falls * 0.45, t, 0.3);
    this.swimGain.gain.setTargetAtTime(p.swimming ? Math.min(p.speed / 5, 1) * 0.08 + 0.02 : 0, t, 0.15);
    // a soft rush of air while you fly, stronger the faster you go
    this.flyGain.gain.setTargetAtTime(p.flying && !p.grounded ? 0.015 + Math.min(p.speed / 14, 1) * 0.06 : 0, t, 0.2);
    this.underwaterFilter.frequency.setTargetAtTime(p.underwater ? 520 : 18000, t, 0.12);
  }

  // ------------------------------------------------------------ building blocks

  private env(g: GainNode, at: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  private tone(o: {
    type?: OscillatorType;
    from: number;
    to?: number;
    glide?: number;
    peak: number;
    attack?: number;
    decay: number;
    delay?: number;
    vibrato?: { rate: number; depth: number };
    reverb?: number;
    dest?: AudioNode;
  }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const at = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.from, at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + (o.glide ?? o.decay));
    if (o.vibrato) {
      const l = ctx.createOscillator();
      l.frequency.value = o.vibrato.rate;
      const lg = ctx.createGain();
      lg.gain.value = o.vibrato.depth;
      l.connect(lg).connect(osc.frequency);
      l.start(at);
      l.stop(at + (o.attack ?? 0.005) + o.decay + 0.05);
    }
    const g = ctx.createGain();
    this.env(g, at, o.peak, o.attack ?? 0.005, o.decay);
    osc.connect(g).connect(o.dest ?? this.sfx);
    if (o.reverb) {
      const s = ctx.createGain();
      s.gain.value = o.reverb;
      g.connect(s).connect(this.reverbSend);
    }
    osc.start(at);
    osc.stop(at + (o.attack ?? 0.005) + o.decay + 0.05);
  }

  private burst(o: { type: BiquadFilterType; from: number; to?: number; q?: number; peak: number; attack?: number; decay: number; delay?: number; reverb?: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const at = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.setValueAtTime(o.from, at);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + (o.attack ?? 0.005) + o.decay);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    this.env(g, at, o.peak, o.attack ?? 0.005, o.decay);
    src.connect(f).connect(g).connect(this.sfx);
    if (o.reverb) {
      const s = ctx.createGain();
      s.gain.value = o.reverb;
      g.connect(s).connect(this.reverbSend);
    }
    src.start(at, Math.random() * 1.5);
    src.stop(at + (o.attack ?? 0.005) + o.decay + 0.05);
  }

  private bell(freq: number, peak: number, decay: number, dest?: AudioNode, delay = 0) {
    this.tone({ from: freq, peak, attack: 0.004, decay, delay, reverb: 1, dest });
    this.tone({ from: freq * 2.01, peak: peak * 0.35, attack: 0.004, decay: decay * 0.6, delay, reverb: 1, dest });
  }

  private plink(freq: number, peak: number) {
    this.tone({ from: freq, to: freq * 1.5, glide: 0.05, peak, attack: 0.002, decay: 0.16, reverb: 1.4, dest: this.amb });
  }

  // ------------------------------------------------------------ sound effects

  jump() {
    this.tone({ type: "sine", from: 380, to: 720, glide: 0.12, peak: 0.16, decay: 0.16 });
    this.burst({ type: "lowpass", from: 900, peak: 0.05, decay: 0.08 });
  }

  superJump() {
    this.tone({ type: "triangle", from: 260, to: 980, glide: 0.3, peak: 0.16, decay: 0.32 });
    this.burst({ type: "bandpass", from: 500, to: 3000, peak: 0.08, attack: 0.05, decay: 0.3 });
  }

  /** Soft fluffy thump on the ground. */
  land(strength: number) {
    const s = Math.min(1, strength / 14);
    if (s < 0.08) return;
    this.tone({ from: 150, to: 70, glide: 0.14, peak: 0.25 * s + 0.03, decay: 0.16 });
    this.burst({ type: "lowpass", from: 600, peak: 0.08 * s, decay: 0.12 });
  }

  /** Cartoon "boing" off a mushroom cap; bigger caps sing lower. */
  boing(strength: number, capR: number) {
    const base = 520 / Math.max(0.7, Math.sqrt(capR));
    const s = Math.min(1, 0.4 + strength / 25);
    this.tone({ type: "triangle", from: base * 0.7, to: base * 1.6, glide: 0.18, peak: 0.2 * s, attack: 0.004, decay: 0.42, vibrato: { rate: 17, depth: base * 0.09 }, reverb: 0.4 });
    this.tone({ type: "sine", from: base * 0.35, to: base * 0.5, glide: 0.2, peak: 0.12 * s, decay: 0.3 });
  }

  /** Squishy plop when you settle onto a cap. */
  squish() {
    this.tone({ from: 320, to: 170, glide: 0.12, peak: 0.13, decay: 0.15 });
    this.burst({ type: "bandpass", from: 1200, to: 500, q: 2, peak: 0.05, decay: 0.12 });
  }

  /** Puffball launch: a rising whoosh with a sparkle on top. */
  launch() {
    this.burst({ type: "bandpass", from: 250, to: 3200, q: 1.2, peak: 0.16, attack: 0.08, decay: 0.7 });
    this.tone({ type: "sine", from: 220, to: 1300, glide: 0.55, peak: 0.12, attack: 0.02, decay: 0.6, reverb: 0.4 });
    this.tone({ from: 300, to: 120, glide: 0.12, peak: 0.18, decay: 0.12 });
    [1568, 2093, 2637].forEach((f, i) => this.bell(f, 0.03, 0.5, undefined, 0.35 + i * 0.07));
  }

  duck() {
    this.tone({ from: 300, to: 190, glide: 0.1, peak: 0.07, decay: 0.12 });
  }

  splash(strength: number) {
    const s = Math.min(1, strength / 12) * 0.8 + 0.2;
    this.burst({ type: "lowpass", from: 2400, to: 400, peak: 0.22 * s, attack: 0.01, decay: 0.45 });
    for (let i = 0; i < 4; i++) this.tone({ from: 300 + Math.random() * 500, to: 700 + Math.random() * 600, glide: 0.05, peak: 0.05, decay: 0.07, delay: 0.1 + i * 0.07 + Math.random() * 0.05 });
  }

  /** One swimming stroke: a soft watery whoosh (a paddle-splash at the surface). */
  swimStroke(atSurface: boolean) {
    if (atSurface) {
      this.burst({ type: "bandpass", from: 1800, to: 700, q: 0.9, peak: 0.07, attack: 0.02, decay: 0.22 });
      this.tone({ from: 380 + Math.random() * 120, to: 620, glide: 0.06, peak: 0.035, decay: 0.08, delay: 0.05 });
    } else {
      this.burst({ type: "lowpass", from: 700, to: 220, peak: 0.12, attack: 0.05, decay: 0.32 });
      if (Math.random() < 0.6) this.bubble();
    }
  }

  /** A soft wing flap for the flying potion. */
  flap() {
    this.burst({ type: "bandpass", from: 900, to: 350, q: 0.7, peak: 0.12, attack: 0.02, decay: 0.18 });
    this.tone({ from: 520, to: 780, glide: 0.08, peak: 0.04, decay: 0.12 });
  }

  /** Camera shutter: a soft click-clack. */
  shutter() {
    this.burst({ type: "highpass", from: 2500, peak: 0.12, attack: 0.002, decay: 0.04 });
    this.burst({ type: "bandpass", from: 1400, q: 2, peak: 0.08, attack: 0.002, decay: 0.05, delay: 0.07 });
  }

  /** A rocket part clunking into place. */
  clunk() {
    this.tone({ type: "triangle", from: 180, to: 120, glide: 0.1, peak: 0.2, decay: 0.2 });
    this.burst({ type: "bandpass", from: 900, q: 3, peak: 0.08, decay: 0.15 });
    [1318.5, 1760].forEach((f, i) => this.bell(f, 0.04, 0.6, undefined, 0.15 + i * 0.08));
  }

  /** A soft little "mm" when someone talks, pitched per speaker. */
  blip(pitch = 1) {
    this.tone({ type: "sine", from: 420 * pitch, to: 480 * pitch, glide: 0.05, peak: 0.05, decay: 0.07 });
  }

  /** The rocket roaring to life and lifting off. */
  launchRoar() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.burst({ type: "lowpass", from: 200, to: 900, peak: 0.35, attack: 1.2, decay: 4.5 });
    this.burst({ type: "bandpass", from: 300, to: 2400, q: 0.6, peak: 0.18, attack: 1.8, decay: 3.5, delay: 0.8 });
    this.tone({ type: "sawtooth", from: 55, to: 110, glide: 4, peak: 0.05, attack: 1, decay: 4 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, 0.06, 2.5, undefined, 2 + i * 0.25));
  }

  bubble() {
    this.tone({ from: 260 + Math.random() * 300, to: 600 + Math.random() * 500, glide: 0.06, peak: 0.04, decay: 0.07 });
  }

  collect() {
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => this.bell(f, 0.09, 1.4, undefined, i * 0.08));
  }

  drink() {
    for (let i = 0; i < 3; i++) this.tone({ from: 240, to: 420, glide: 0.08, peak: 0.12, decay: 0.1, delay: i * 0.13 });
    [1318.5, 1760, 2349].forEach((f, i) => this.bell(f, 0.05, 0.9, undefined, 0.42 + i * 0.07));
  }

  /** A tiny creature squeak; pitch varies per creature. */
  squeak(pitch = 1) {
    const f = 950 * pitch;
    this.tone({ type: "sine", from: f, to: f * 1.45, glide: 0.07, peak: 0.07, decay: 0.1 });
    this.tone({ type: "sine", from: f * 1.4, to: f * 1.05, glide: 0.08, peak: 0.05, decay: 0.1, delay: 0.09 });
  }

  stop() {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    void this.ctx?.close();
    this.ctx = null;
    this.emit();
  }
}

export const sound = new SoundEngine();
