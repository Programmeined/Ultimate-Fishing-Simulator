let audioCtx: AudioContext | null = null;

function playTone(
  frequency: number,
  duration: number,
  volumePercent: number,
  muted: boolean,
  type: OscillatorType = 'sine',
  endFrequency?: number
): void {
  if (muted || volumePercent <= 0 || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx || new Ctor();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    if (endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(endFrequency, audioCtx.currentTime + duration);
    }
    const vol = Math.max(0.002, (volumePercent / 100) * 0.06);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio context failures in restricted environments
  }
}

export function playCastSound(volume: number, muted: boolean): void {
  playTone(240, 0.14, volume, muted, 'triangle', 130);
}

export function playBiteSound(volume: number, muted: boolean): void {
  playTone(620, 0.12, volume, muted, 'sine', 780);
  setTimeout(() => playTone(780, 0.14, volume, muted, 'sine', 880), 90);
}

export function playStrikeSound(volume: number, muted: boolean): void {
  playTone(420, 0.14, volume, muted, 'triangle', 540);
}

export function playReelClick(volume: number, muted: boolean): void {
  playTone(320 + Math.random() * 40, 0.04, volume * 0.6, muted, 'square');
}

export function playLandFanfare(volume: number, muted: boolean): void {
  playTone(523, 0.12, volume, muted, 'triangle');
  setTimeout(() => playTone(659, 0.12, volume, muted, 'triangle'), 100);
  setTimeout(() => playTone(784, 0.22, volume, muted, 'triangle'), 200);
}

export function playSnapSound(volume: number, muted: boolean): void {
  playTone(220, 0.18, volume, muted, 'sawtooth', 90);
}

export function playPurchaseSound(volume: number, muted: boolean): void {
  playTone(660, 0.09, volume, muted, 'sine');
  setTimeout(() => playTone(880, 0.12, volume, muted, 'sine'), 80);
}
