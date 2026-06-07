/**
 * YouTubeHybridPlayer.tsx
 * Headless YouTube IFrame player that drives the PlayerStore.
 * Works in both Electron and web browsers.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '../../store/player';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const YouTubeHybridPlayer: React.FC = () => {
  const playerRef      = useRef<any>(null);
  const syncInterval   = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted      = useRef(true);
  const lastYoutubeId  = useRef<string | null>(null);

  const youtubeId      = usePlayerStore(s => s.youtubeId);
  const isPlaying      = usePlayerStore(s => s.isPlaying);
  const playbackSource = usePlayerStore(s => s.playbackSource);
  const volume         = usePlayerStore(s => s.volume);
  const muted          = usePlayerStore(s => s.muted);
  const seekTo         = usePlayerStore(s => s.seekTo);

  const setDuration      = usePlayerStore(s => s.setDuration);
  const setCurrentTime   = usePlayerStore(s => s.setCurrentTime);
  const setIsIframeReady = usePlayerStore(s => s.setIsIframeReady);
  const setSeekTo        = usePlayerStore(s => s.setSeekTo);
  const playNext         = usePlayerStore(s => s.playNext);

  // ── Time sync interval ─────────────────────────
  const startSync = useCallback(() => {
    if (syncInterval.current) clearInterval(syncInterval.current);
    syncInterval.current = setInterval(() => {
      if (!isMounted.current) return;
      try {
        const p = playerRef.current;
        if (!p || typeof p.getCurrentTime !== 'function') return;
        const state = p.getPlayerState?.();
        if (state === window.YT?.PlayerState?.PLAYING) {
          setCurrentTime(p.getCurrentTime());
        }
      } catch (_) {}
    }, 500);
  }, [setCurrentTime]);

  const stopSync = useCallback(() => {
    if (syncInterval.current) { clearInterval(syncInterval.current); syncInterval.current = null; }
  }, []);

  // ── Init player ────────────────────────────────
  const initPlayer = useCallback(() => {
    if (playerRef.current) return;

    playerRef.current = new window.YT.Player('hybrid-youtube-iframe', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay:       0,
        controls:       0,
        disablekb:      1,
        fs:             0,
        iv_load_policy: 3,
        modestbranding: 1,
        rel:            0,
        origin:         window.location.origin,
      },
      events: {
        onReady: () => {
          setIsIframeReady(true);
          // Apply initial volume — always, regardless of playbackSource
          try {
            const state = usePlayerStore.getState();
            if (state.muted) {
              playerRef.current.mute();
            } else {
              playerRef.current.unMute();
              playerRef.current.setVolume(state.volume * 100);
            }
          } catch (_) {}
        },
        onStateChange: (event: any) => {
          if (!isMounted.current) return;
          const YT = window.YT;
          if (!YT) return;

          switch (event.data) {
            case YT.PlayerState.PLAYING:
              setDuration(playerRef.current.getDuration());
              startSync();
              break;
            case YT.PlayerState.PAUSED:
              stopSync();
              // Update current time once on pause for accurate scrubber position
              try { setCurrentTime(playerRef.current.getCurrentTime()); } catch (_) {}
              break;
            case YT.PlayerState.ENDED:
              stopSync();
              if (usePlayerStore.getState().repeat === 'one') {
                playerRef.current.seekTo(0);
                playerRef.current.playVideo();
              } else {
                playNext();
              }
              break;
            default:
              break;
          }
        },
        onError: (event: any) => {
          console.warn('[YouTube] Player error:', event.data);
          // Try next track on unplayable
          if ([100, 101, 150].includes(event.data)) {
            playNext();
          }
        },
      },
    });
  }, [setIsIframeReady, setDuration, setCurrentTime, startSync, stopSync, playNext]);

  // ── Load YouTube API ───────────────────────────
  useEffect(() => {
    isMounted.current = true;

    if (window.YT?.Player) {
      initPlayer();
    } else {
      // Inject script once
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id  = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = () => { if (isMounted.current) initPlayer(); };
    }

    return () => {
      isMounted.current = false;
      stopSync();
      try { playerRef.current?.destroy(); } catch (_) {}
      playerRef.current = null;
    };
  }, [initPlayer, stopSync]);

  // ── Detener YouTube si la fuente ya no es iframe ──────────────────────────
  useEffect(() => {
    if (playbackSource !== 'iframe') {
      try {
        const p = playerRef.current;
        if (p?.stopVideo) {
          p.stopVideo();
          stopSync();
          // Resetear el ID para que la próxima carga sea completa
          lastYoutubeId.current = null;
          console.log('[YouTube] Fuente cambiada a', playbackSource, '— reproductor detenido.');
        }
      } catch (_) {}
    }
  }, [playbackSource, stopSync]);

  // ── Load video ID ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!youtubeId || !playerRef.current?.loadVideoById) return;
    if (youtubeId === lastYoutubeId.current) return;

    lastYoutubeId.current = youtubeId;
    setCurrentTime(0);

    try {
      playerRef.current.loadVideoById(youtubeId);
      // loadVideoById auto-plays; if we should NOT be playing, pause right after
      if (!isPlaying) {
        setTimeout(() => { try { playerRef.current?.pauseVideo(); } catch (_) {} }, 300);
      }
    } catch (e) {
      console.warn('[YouTube] loadVideoById error:', e);
    }
  }, [youtubeId]);

  // ── Play / Pause ───────────────────────────────
  useEffect(() => {
    if (playbackSource !== 'iframe') return;
    try {
      const p = playerRef.current;
      if (!p?.playVideo) return;
      if (isPlaying) {
        p.playVideo();
        startSync();
      } else {
        p.pauseVideo();
        stopSync();
      }
    } catch (e) {
      console.warn('[YouTube] play/pause error:', e);
    }
  }, [isPlaying, playbackSource, startSync, stopSync]);

  // ── Seek ───────────────────────────────────────
  useEffect(() => {
    if (seekTo == null || playbackSource !== 'iframe') return;
    try {
      playerRef.current?.seekTo(seekTo, true);
      setCurrentTime(seekTo);
      setSeekTo(null);
    } catch (e) {
      console.warn('[YouTube] seek error:', e);
    }
  }, [seekTo, playbackSource, setCurrentTime, setSeekTo]);

  // ── Volume / Mute ──────────────────────────────
  useEffect(() => {
    try {
      const p = playerRef.current;
      if (!p?.setVolume) return;
      if (muted) {
        p.mute();
      } else {
        p.unMute();
        p.setVolume(volume * 100);
      }
    } catch (e) {
      console.warn('[YouTube] volume error:', e);
    }
  }, [volume, muted]);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
    >
      <div id="hybrid-youtube-iframe" />
    </div>
  );
};
