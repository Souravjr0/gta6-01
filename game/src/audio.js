// Sound, all synthesized with WebAudio — no audio files, no network. A low bass loop
// for the street, an engine hum that follows the car's speed, a two-tone siren when
// the police are near, and one-shot blips for gunshots, pickups and mission paydays.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = null;
  let muted = false;
  let note = 0;

  const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'square';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function noise(dur, vol) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(master);
    src.start();
  }

  return {
    /** Call on the first user gesture; browsers block audio before one. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      if (ctx && !musicTimer) {
        musicTimer = window.setInterval(() => {
          if (muted) return;
          blip(BASS[note % BASS.length], 0.42, 'triangle', 0.12);
          note += 1;
        }, 430);
      }
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    get muted() { return muted; },
    /** Continuous layers, called every frame: engine by speed, siren by wanted level. */
    update(speed, wanted) {
      if (!ctx || muted) return;
      engineGain.gain.value = Math.min(0.12, Math.abs(speed) / 560 * 0.12);
      engineOsc.frequency.value = 50 + Math.abs(speed) * 0.16;
      if (wanted > 0) {
        sirenGain.gain.value = 0.045;
        sirenOsc.frequency.value = 700 + Math.sin(performance.now() / 260) * 220;
      } else {
        sirenGain.gain.value = 0;
      }
    },
    gunshot() { noise(0.12, 0.3); },
    punch() { noise(0.08, 0.22); },
    crash() { noise(0.25, 0.35); },
    pickup() { blip(880, 0.12, 'sine', 0.25); blip(1320, 0.18, 'sine', 0.2); },
    payday() { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => blip(f, 0.22, 'triangle', 0.25), i * 90)); },
    busted() { blip(220, 0.5, 'sawtooth', 0.25); },
  };
}
