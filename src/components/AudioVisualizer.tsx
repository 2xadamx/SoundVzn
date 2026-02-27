import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  audioElement?: HTMLAudioElement | null;
  isPlaying: boolean;
  mode?: 'bars' | 'waves' | 'circular' | 'particles';
  accentColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  audioElement,
  isPlaying,
  mode = 'bars',
  accentColor = '#0ea5e9',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const audioContextRef = useRef<AudioContext>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    }

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    const draw = () => {
      if (!analyser || !dataArray || !ctx) return;

      analyser.getByteFrequencyData(dataArray as any);

      ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      switch (mode) {
        case 'bars':
          drawBars(ctx, canvas, dataArray, accentColor);
          break;
        case 'waves':
          drawWaves(ctx, canvas, dataArray, accentColor);
          break;
        case 'circular':
          drawCircular(ctx, canvas, dataArray, accentColor);
          break;
        case 'particles':
          drawParticles(ctx, canvas, dataArray, accentColor);
          break;
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      try {
        sourceRef.current?.disconnect();
        analyserRef.current?.disconnect();
      } catch {
        // noop
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
      }
      sourceRef.current = undefined;
      analyserRef.current = undefined;
      audioContextRef.current = undefined;
    };
  }, [audioElement, isPlaying, mode, accentColor]);

  return (
    <motion.canvas
      ref={canvasRef}
      width={800}
      height={400}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full h-full rounded-lg"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}
    />
  );
};

function drawBars(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  color: string
) {
  const barWidth = (canvas.width / dataArray.length) * 2.5;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

    const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + '40');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

    ctx.shadowBlur = 20;
    ctx.shadowColor = color;

    x += barWidth + 2;
  }
}

function drawWaves(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  color: string
) {
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;

  ctx.beginPath();

  const sliceWidth = canvas.width / dataArray.length;
  let x = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const v = dataArray[i] / 255.0;
    const y = (v * canvas.height) / 2 + canvas.height / 4;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.stroke();
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  color: string
) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 3;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;

  for (let i = 0; i < dataArray.length; i++) {
    const angle = (i / dataArray.length) * Math.PI * 2;
    const amp = dataArray[i] / 255.0;
    const length = radius + amp * 100;

    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * length;
    const y2 = centerY + Math.sin(angle) * length;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  dataArray: Uint8Array,
  color: string
) {
  const particles = 50;

  for (let i = 0; i < particles; i++) {
    const dataIndex = Math.floor((i / particles) * dataArray.length);
    const value = dataArray[dataIndex] / 255;

    const x = (i / particles) * canvas.width;
    const y = canvas.height / 2;
    const size = value * 20 + 2;
    const offsetY = (Math.random() - 0.5) * value * 100;

    const gradient = ctx.createRadialGradient(x, y + offsetY, 0, x, y + offsetY, size);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y + offsetY, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
