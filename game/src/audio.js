// All of Inkbound's sound is synthesized with WebAudio: no audio files, no network.
// Every effect is a short oscillator or filtered-noise burst, mixed into one master gain.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      context = new AC();
      master = context.createGain();
      master.gain.value = 0.32;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, lowpass) {
    if (muted || !ensure()) return;
    const t0 = context.currentTime;
    const len = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = context.createBufferSource();
    src.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A soft scratch while the pen draws. */
    draw() {
      noise(0.05, 0.1, 2400);
    },
    /** A stroke lands. */
    stamp() {
      tone(220, 0.09, 'triangle', 0.25, 140);
    },
    /** A stroke is erased. */
    erase() {
      noise(0.12, 0.16, 900);
    },
    jump() {
      tone(300, 0.12, 'sine', 0.3, 560);
    },
    land() {
      noise(0.07, 0.2, 500);
    },
    star() {
      tone(880, 0.12, 'sine', 0.3);
      setTimeout(() => tone(1318, 0.18, 'sine', 0.28), 70);
    },
    spring() {
      tone(180, 0.22, 'sine', 0.35, 720);
    },
    portal() {
      tone(520, 0.16, 'sine', 0.25, 1040);
      setTimeout(() => tone(1040, 0.14, 'sine', 0.2, 520), 90);
    },
    death() {
      tone(320, 0.4, 'sawtooth', 0.22, 60);
      noise(0.25, 0.2, 700);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.3), i * 95));
    },
    click() {
      tone(660, 0.06, 'square', 0.14);
    },
    levelStart() {
      tone(392, 0.1, 'triangle', 0.22);
      setTimeout(() => tone(523, 0.14, 'triangle', 0.22), 90);
    },
  };
}
