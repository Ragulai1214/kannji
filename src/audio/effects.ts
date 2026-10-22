import { SOUND } from '../data/sound.ts';

export type Effect = 'start' | 'draw' | 'reveal' | 'keep' | 'discard' | 'point' | 'rare' | 'impact' | 'win' | 'lose' | 'tie';
const NOTES: Record<Effect, readonly number[]> = {
  start: [330, 440, 660], draw: [150, 220], reveal: [440, 660], keep: [550, 825], discard: [220, 130],
  point: [660], rare: [660, 880, 1320], impact: [100, 55], win: [440, 550, 660, 880], lose: [330, 260, 165], tie: [440, 440],
};

export function createEffects() {
  let context: AudioContext | undefined;
  let enabled = true;
  let disposed = false;
  const voices = new Set<AudioScheduledSourceNode>();
  function stop(): void {
    voices.forEach(voice => { try { voice.stop(); } catch { /* already ended */ } voice.disconnect(); });
    voices.clear();
  }
  async function unlock(): Promise<void> {
    if (!enabled || disposed) return;
    try {
      context ??= new AudioContext();
      if (context.state === 'suspended') await context.resume();
    } catch { /* Audio is optional; gameplay continues if unavailable. */ }
  }
  function play(effect: Effect): void {
    if (!enabled || disposed || !context || context.state !== 'running') return;
    const start = context.currentTime;
    if (effect === 'impact' && voices.size < SOUND.maxVoices) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 173;
      for (let i = 0; i < samples.length; i++) { seed = (seed * 16807) % 2147483647; samples[i] = seed / 1073741824 - 1; }
      const noise = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
      noise.buffer = buffer; filter.type = 'highpass'; filter.frequency.value = 650;
      gain.gain.setValueAtTime(SOUND.volume, start); gain.gain.exponentialRampToValueAtTime(.001, start + .12);
      noise.connect(filter); filter.connect(gain); gain.connect(context.destination);
      voices.add(noise);
      noise.onended = () => { voices.delete(noise); noise.disconnect(); filter.disconnect(); gain.disconnect(); };
      noise.start(start); noise.stop(start + .12);
    }
    NOTES[effect].forEach((frequency, index) => {
      if (voices.size >= SOUND.maxVoices) return;
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const time = start + index * .07;
      const length = effect === 'win' || effect === 'lose' ? .3 : .14;
      oscillator.type = effect === 'impact' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(SOUND.volume, time + .008);
      gain.gain.exponentialRampToValueAtTime(.001, time + length);
      oscillator.connect(gain); gain.connect(context!.destination);
      voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(time); oscillator.stop(time + length + .02);
    });
  }
  return {
    unlock, play, stop,
    get enabled() { return enabled; },
    toggle(): void { enabled = !enabled; if (!enabled) stop(); else void unlock(); },
    dispose(): void { disposed = true; stop(); void context?.close().catch(() => {}); },
  };
}
