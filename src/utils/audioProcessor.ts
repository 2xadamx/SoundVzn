export interface AudioChain {
  gain: GainNode;
  eq: {
    low: BiquadFilterNode;
    mid: BiquadFilterNode;
    high: BiquadFilterNode;
  };
  karaokeSplitter: ChannelSplitterNode;
  karaokeInverter: GainNode;
  karaokeMerger: ChannelMergerNode;
  karaokeWetGain: GainNode;
  karaokeDryGain: GainNode;
  vocalPass: BiquadFilterNode;
  vocalGain: GainNode;
}

export interface AudioProcessor {
  context: AudioContext;
  sourceA: MediaElementAudioSourceNode | null;
  sourceB: MediaElementAudioSourceNode | null;
  deckA: AudioChain;
  deckB: AudioChain;
  masterGain: GainNode;
  analyserNode: AnalyserNode;
  masterEQ: BiquadFilterNode[];
  compressorNode: DynamicsCompressorNode;
  pannerNode: PannerNode;
  autoGainNode: GainNode;
  autoGainInterval: ReturnType<typeof setInterval> | null;
  convolverNode: ConvolverNode;
  reverbWetGain: GainNode;
  reverbDryGain: GainNode;
  audioA: HTMLAudioElement;
  audioB: HTMLAudioElement;
  connected: boolean;
}

let audioProcessor: AudioProcessor | null = null;

export function getAudioProcessor(): AudioProcessor | null {
  return audioProcessor;
}

const createAudioChain = (context: AudioContext): AudioChain => {
  const gain = context.createGain();
  
  // 3-Band Deck EQ
  const low = context.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 320;
  
  const mid = context.createBiquadFilter();
  mid.type = 'peaking';
  mid.frequency.value = 1000;
  mid.Q.value = 0.5;
  
  const high = context.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 3200;

  // Karaoke (OOPS)
  const karaokeSplitter = context.createChannelSplitter(2);
  const karaokeInverter = context.createGain();
  karaokeInverter.gain.value = -1;
  const karaokeMerger = context.createChannelMerger(2);
  const karaokeWetGain = context.createGain();
  const karaokeDryGain = context.createGain();
  
  karaokeWetGain.gain.value = 0;
  karaokeDryGain.gain.value = 1;

  karaokeSplitter.connect(karaokeMerger, 0, 0);
  karaokeSplitter.connect(karaokeInverter, 1);
  karaokeInverter.connect(karaokeMerger, 0, 0);
  karaokeInverter.connect(karaokeMerger, 0, 1);
  karaokeMerger.connect(karaokeWetGain);

  // Vocal Isolation (Bandpass approx)
  const vocalPass = context.createBiquadFilter();
  vocalPass.type = 'bandpass';
  vocalPass.frequency.value = 1500;
  vocalPass.Q.value = 0.5;
  const vocalGain = context.createGain();
  vocalGain.gain.value = 0;

  // Connections within chain:
  // Source -> Gain -> Low -> Mid -> High -> (Split to Karaoke / Dry / Vocal)
  gain.connect(low);
  low.connect(mid);
  mid.connect(high);
  
  high.connect(karaokeSplitter);
  high.connect(karaokeDryGain);
  high.connect(vocalPass);
  vocalPass.connect(vocalGain);

  return {
    gain, 
    eq: { low, mid, high },
    karaokeSplitter, karaokeInverter, karaokeMerger, karaokeWetGain, karaokeDryGain,
    vocalPass, vocalGain
  };
};

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  flat:            [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  bass_boost:      [6,  5,  4,  2,  0,  0, -1, -1, -1, -1],
  treble_boost:    [-1,-1, -1,  0,  1,  2,  3,  4,  5,  6],
  vocal:           [-2,-2,  0,  2,  4,  4,  3,  2,  1,  0],
  audiophile:      [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  mobile_optimized:[4,  3,  2,  1,  0,  0,  1,  2,  3,  4],
  club:            [4,  3,  2,  0, -1, -1,  0,  2,  3,  4],
  acoustic:        [3,  2,  1,  0, -1,  0,  1,  2,  2,  3],
  electronic:      [4,  2,  0, -1, -2,  0,  2,  3,  4,  5],
  jazz:            [2,  1,  0,  1,  2,  2,  1,  0, -1, -1],
  rock:            [4,  3,  1, -1, -2,  0,  1,  3,  4,  4],
  classical:       [3,  2,  1,  0,  0,  0,  0,  1,  2,  3],
  custom:          [0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
};

export function applyEQPreset(preset: keyof typeof EQ_PRESETS): void {
  const gains = EQ_PRESETS[preset as string];
  if (!gains || !audioProcessor) return;
  gains.forEach((gain, i) => {
    const band = audioProcessor!.masterEQ[i];
    if (band) band.gain.setTargetAtTime(gain, audioProcessor!.context.currentTime, 0.05);
  });
}

export function setEQGain(bandIndex: number, gain: number): void {
  if (!audioProcessor) return;
  const band = audioProcessor.masterEQ[bandIndex];
  if (band) band.gain.setTargetAtTime(gain, audioProcessor.context.currentTime, 0.05);
}

export function enableMobileOptimization(): void {
  applyEQPreset('mobile_optimized');
}

export function setPlaybackRate(deck: number, rate: number): void {
  if (!audioProcessor) return;
  // Playback rate is controlled via the HTMLAudioElement, not Web Audio API
  // This is a no-op stub for API compatibility — actual rate control happens on the audio element
  try {
    const audio = deck === 0 ? audioProcessor.audioA : audioProcessor.audioB;
    if (audio) audio.playbackRate = rate;
  } catch { /* ignore */ }
}

export async function initAudioProcessor(audioA: HTMLAudioElement, audioB: HTMLAudioElement): Promise<AudioProcessor> {
  if (audioProcessor && audioProcessor.connected) return audioProcessor;

  const context = new AudioContext({ sampleRate: 192000 });
  const sourceA = context.createMediaElementSource(audioA);
  const sourceB = context.createMediaElementSource(audioB);
  
  const deckA = createAudioChain(context);
  const deckB = createAudioChain(context);
  
  const masterGain = context.createGain();
  const analyserNode = context.createAnalyser();
  const compressorNode = context.createDynamicsCompressor();
  const pannerNode = context.createPanner();
  const autoGainNode = context.createGain();
  
  const convolverNode = context.createConvolver();
  const reverbWetGain = context.createGain();
  const reverbDryGain = context.createGain();
  reverbWetGain.gain.value = 0;

  // Master EQ (10 bands)
  const masterEQ = EQ_FREQUENCIES.map((freq, i) => {
    const f = context.createBiquadFilter();
    f.type = i === 0 ? 'lowshelf' : (i === 9 ? 'highshelf' : 'peaking');
    f.frequency.value = freq;
    return f;
  });

  // Routing
  sourceA.connect(deckA.gain);
  sourceB.connect(deckB.gain);

  // Decks to Master EQ
  const connectDeckToMaster = (deck: AudioChain) => {
    deck.karaokeWetGain.connect(masterEQ[0]);
    deck.karaokeDryGain.connect(masterEQ[0]);
    deck.vocalGain.connect(masterEQ[0]);
  };
  connectDeckToMaster(deckA);
  connectDeckToMaster(deckB);

  for (let i = 0; i < masterEQ.length - 1; i++) {
    masterEQ[i].connect(masterEQ[i + 1]);
  }
  
  masterEQ[9].connect(compressorNode);
  compressorNode.connect(pannerNode);
  pannerNode.connect(autoGainNode);
  
  autoGainNode.connect(reverbDryGain);
  autoGainNode.connect(convolverNode);
  convolverNode.connect(reverbWetGain);
  
  reverbDryGain.connect(masterGain);
  reverbWetGain.connect(masterGain);
  masterGain.connect(analyserNode);
  analyserNode.connect(context.destination);

  audioProcessor = {
    context, sourceA, sourceB, deckA, deckB,
    masterGain, analyserNode, masterEQ, compressorNode, pannerNode,
    autoGainNode, 
    autoGainInterval: null,
    convolverNode, reverbWetGain, reverbDryGain,
    audioA, audioB, connected: true
  };

  return audioProcessor;
}

export function setKaraokeMode(enabled: boolean): void {
  if (!audioProcessor) return;
  setDeckMode('A', enabled ? 'instrumental' : 'normal');
}

export type ReverbPreset = 'off' | 'studio' | 'club' | 'hall' | 'stadium';
export const REVERB_PRESETS: Record<ReverbPreset, { duration: number, decay: number }> = {
  off: { duration: 0, decay: 0 },
  studio: { duration: 0.8, decay: 2.5 },
  club: { duration: 1.5, decay: 3.5 },
  hall: { duration: 2.5, decay: 4.5 },
  stadium: { duration: 4.5, decay: 6.0 },
};

export function createImpulseResponse(duration: number, decay: number, reverse: boolean = false): AudioBuffer | null {
  if (!audioProcessor) return null;
  const sampleRate = audioProcessor.context.sampleRate;
  const length = sampleRate * duration;
  const impulse = audioProcessor.context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const n = reverse ? length - i : i;
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }
  }
  return impulse;
}

export function setReverbPreset(preset: ReverbPreset): void {
  if (!audioProcessor) return;
  if (preset === 'off') {
    audioProcessor.reverbWetGain.gain.setTargetAtTime(0, audioProcessor.context.currentTime, 0.1);
    return;
  }
  const config = REVERB_PRESETS[preset];
  const buffer = createImpulseResponse(config.duration, config.decay);
  if (buffer) {
    audioProcessor.convolverNode.buffer = buffer;
    audioProcessor.reverbWetGain.gain.setTargetAtTime(0.5, audioProcessor.context.currentTime, 0.1);
  }
}

export function setReverbMix(mix: number): void {
  if (!audioProcessor) return;
  audioProcessor.reverbWetGain.gain.setTargetAtTime(mix, audioProcessor.context.currentTime, 0.1);
  audioProcessor.reverbDryGain.gain.setTargetAtTime(1 - mix * 0.5, audioProcessor.context.currentTime, 0.1);
}

export function setAutoGain(enabled: boolean): void {
  if (!audioProcessor) return;
  audioProcessor.autoGainNode.gain.setTargetAtTime(enabled ? 1.5 : 1.0, audioProcessor.context.currentTime, 0.5);
}

export function setSpatialPosition(x: number, y: number, z: number): void {
    if (!audioProcessor) return;
    const now = audioProcessor.context.currentTime;
    audioProcessor.pannerNode.positionX.setTargetAtTime(x, now, 0.1);
    audioProcessor.pannerNode.positionY.setTargetAtTime(y, now, 0.1);
    audioProcessor.pannerNode.positionZ.setTargetAtTime(z, now, 0.1);
}

export function setCrossfade(value: number): void {
    if (!audioProcessor) return;
    const x = value / 100;
    setDeckVolume('A', Math.cos(x * 0.5 * Math.PI));
    setDeckVolume('B', Math.sin(x * 0.5 * Math.PI));
}

export function crossfade(targetAudio: number, duration: number): void {
    if (!audioProcessor) return;
    const now = audioProcessor.context.currentTime;
    const ramp = duration / 1000;
    
    if (targetAudio === 0) {
        audioProcessor.deckA.gain.gain.setTargetAtTime(1, now, ramp);
        audioProcessor.deckB.gain.gain.setTargetAtTime(0, now, ramp);
    } else {
        audioProcessor.deckA.gain.gain.setTargetAtTime(0, now, ramp);
        audioProcessor.deckB.gain.gain.setTargetAtTime(1, now, ramp);
    }
}

export function setDeckMode(deck: 'A' | 'B', mode: 'normal' | 'instrumental' | 'vocal'): void {
  if (!audioProcessor) return;
  const d = deck === 'A' ? audioProcessor.deckA : audioProcessor.deckB;
  const now = audioProcessor.context.currentTime;
  const ramp = 0.1;

  if (mode === 'instrumental') {
    d.karaokeDryGain.gain.setTargetAtTime(0, now, ramp);
    d.karaokeWetGain.gain.setTargetAtTime(1, now, ramp);
    d.vocalGain.gain.setTargetAtTime(0, now, ramp);
  } else if (mode === 'vocal') {
    d.karaokeDryGain.gain.setTargetAtTime(0, now, ramp);
    d.karaokeWetGain.gain.setTargetAtTime(0, now, ramp);
    d.vocalGain.gain.setTargetAtTime(1.5, now, ramp); // Boost slightly
  } else {
    d.karaokeDryGain.gain.setTargetAtTime(1, now, ramp);
    d.karaokeWetGain.gain.setTargetAtTime(0, now, ramp);
    d.vocalGain.gain.setTargetAtTime(0, now, ramp);
  }
}

export function setDeckVolume(deck: 'A' | 'B', volume: number): void {
  if (!audioProcessor) return;
  const d = deck === 'A' ? audioProcessor.deckA : audioProcessor.deckB;
  d.gain.gain.setTargetAtTime(volume, audioProcessor.context.currentTime, 0.05);
}

// ... Additional setters (Crossfade, EQ, Reverb) would follow similar logic ...
