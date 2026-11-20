/**
 * ============================================================================
 * SRC/HOOKS/USEAUDIOALERT.TS — Web Audio API Sound Engine (Browser Autoplay Safe)
 * ============================================================================
 */

import { useCallback, useRef, useState } from 'react';

export interface AudioAlertControls {
  soundEnabled: boolean;
  unlockAudio: () => void;
  playAlertChime: () => void;
  toggleSound: () => boolean;
}

export function useAudioAlert(): AudioAlertControls {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef<boolean>(false);

  const unlockAudio = useCallback(() => {
    if (unlockedRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      unlockedRef.current = true;
    } catch {
      // Ignore on restricted devices
    }
  }, []);

  const playAlertChime = useCallback(() => {
    if (!soundEnabled) return;
    unlockAudio();
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.16);
      osc.frequency.setValueAtTime(880, now + 0.32);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.56);
    } catch {
      // Fallback silent if browser blocks autoplay
    }
  }, [soundEnabled, unlockAudio]);

  const toggleSound = useCallback((): boolean => {
    unlockAudio();
    let nextState = true;
    setSoundEnabled((prev) => {
      nextState = !prev;
      return nextState;
    });
    return nextState;
  }, [unlockAudio]);

  return {
    soundEnabled,
    unlockAudio,
    playAlertChime,
    toggleSound
  };
}
