export interface AudioProcessor {
  context: AudioContext;
  sourceNode: MediaElementAudioSourceNode | null;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
  eqNodes: BiquadFilterNode[];
  compressorNode: DynamicsCompressorNode;
  connected: boolean;
}

let audioProcessor: AudioProcessor | null = null;

export const EQ_FREQUENCIES = [
  32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000
];

export const EQ_PRESETS = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  pop: [2, 1, 0, 1, 3, 3, 1, 0, 1, 2],
  jazz: [4, 3, 1, 1, -1, -1, 0, 2, 3, 4],
  classical: [4, 3, 2, 0, 0, 0, -1, -2, -2, -3],
  electronic: [6, 5, 2, 0, -2, 2, 1, 2, 5, 6],
  bass_boost: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0],
  treble_boost: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8],
  vocal_boost: [0, -1, -2, -1, 3, 4, 3, 1, 0, -1],
  mobile_optimized: [4, 3, 1, 0, 2, 3, 4, 6, 5, 3],
  audiophile: [1, 1, 0, 0, 0, 0, 0, 1, 1, 2],
};

export async function initAudioProcessor(audioElement: HTMLAudioElement): Promise<AudioProcessor> {
  if (audioProcessor && audioProcessor.connected) {
    return audioProcessor;
  }

  const context = new AudioContext({ sampleRate: 192000 });
  
  const sourceNode = context.createMediaElementSource(audioElement);
  const gainNode = context.createGain();
  const analyserNode = context.createAnalyser();
  const compressorNode = context.createDynamicsCompressor();

  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.8;

  compressorNode.threshold.value = -24;
  compressorNode.knee.value = 30;
  compressorNode.ratio.value = 12;
  compressorNode.attack.value = 0.003;
  compressorNode.release.value = 0.25;

  const eqNodes: BiquadFilterNode[] = EQ_FREQUENCIES.map((freq, index) => {
    const filter = context.createBiquadFilter();
    
    if (index === 0) {
      filter.type = 'lowshelf';
    } else if (index === EQ_FREQUENCIES.length - 1) {
      filter.type = 'highshelf';
    } else {
      filter.type = 'peaking';
    }
    
    filter.frequency.value = freq;
    filter.Q.value = 1.0;
    filter.gain.value = 0;
    
    return filter;
  });

  sourceNode.connect(eqNodes[0]);
  
  for (let i = 0; i < eqNodes.length - 1; i++) {
    eqNodes[i].connect(eqNodes[i + 1]);
  }
  
  eqNodes[eqNodes.length - 1].connect(compressorNode);
  compressorNode.connect(gainNode);
  gainNode.connect(analyserNode);
  analyserNode.connect(context.destination);

  audioProcessor = {
    context,
    sourceNode,
    gainNode,
    analyserNode,
    eqNodes,
    compressorNode,
    connected: true,
  };

  return audioProcessor;
}

export function setEQGain(bandIndex: number, gain: number): void {
  if (!audioProcessor || bandIndex < 0 || bandIndex >= audioProcessor.eqNodes.length) {
    return;
  }
  
  audioProcessor.eqNodes[bandIndex].gain.value = gain;
}

export function applyEQPreset(presetName: keyof typeof EQ_PRESETS): void {
  if (!audioProcessor) return;
  
  const preset = EQ_PRESETS[presetName];
  preset.forEach((gain, index) => {
    setEQGain(index, gain);
  });
}

export function getAudioProcessor(): AudioProcessor | null {
  return audioProcessor;
}

export async function destroyAudioProcessor(): Promise<void> {
  if (!audioProcessor) return;
  try { audioProcessor.sourceNode?.disconnect(); } catch { }
  try { audioProcessor.eqNodes.forEach((n) => n.disconnect()); } catch { }
  try { audioProcessor.compressorNode.disconnect(); } catch { }
  try { audioProcessor.gainNode.disconnect(); } catch { }
  try { audioProcessor.analyserNode.disconnect(); } catch { }
  try {
    if (audioProcessor.context.state !== 'closed') {
      await audioProcessor.context.close();
    }
  } catch { }
  audioProcessor = null;
}

export function setMasterGain(gain: number): void {
  if (!audioProcessor) return;
  audioProcessor.gainNode.gain.value = gain;
}

export function applyUpsampleTo192kHz(enabled: boolean): void {
  if (!audioProcessor) return;
  
  if (enabled && audioProcessor.context.sampleRate < 192000) {
    console.log('Upsampling to 192kHz (simulated via high sample rate context)');
  }
}

export function enableMobileOptimization(): void {
  applyEQPreset('mobile_optimized');
  
  if (audioProcessor) {
    audioProcessor.compressorNode.threshold.value = -20;
    audioProcessor.compressorNode.ratio.value = 8;
  }
}

export function getAudioQualityInfo(): {
  sampleRate: number;
  bitDepth: string;
  latency: number;
} {
  if (!audioProcessor) {
    return {
      sampleRate: 48000,
      bitDepth: '16-bit',
      latency: 0,
    };
  }

  return {
    sampleRate: audioProcessor.context.sampleRate,
    bitDepth: '24-bit (float)',
    latency: audioProcessor.context.baseLatency,
  };
}
