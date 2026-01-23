"use client";

import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================
// SOUND EFFECTS SYSTEM
// ============================================

interface SoundSettings {
  enabled: boolean;
  volume: number;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useSoundSettings = create<SoundSettings>()(
  persist(
    (set) => ({
      enabled: true,
      volume: 0.5,
      setEnabled: (enabled) => set({ enabled }),
      setVolume: (volume) => set({ volume }),
    }),
    {
      name: "squadup_sounds",
    }
  )
);

// Sound effect types
type SoundEffect = 
  | "ready"      // Ready check beep
  | "pick"       // Captain picked player
  | "join"       // Player joined
  | "leave"      // Player left
  | "countdown"  // Countdown tick
  | "start"      // Match starting
  | "click";     // UI click

// Generate sounds using Web Audio API (no external files needed)
const createBeep = (
  frequency: number,
  duration: number,
  type: OscillatorType = "sine",
  volume: number = 0.5
): (() => void) => {
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Audio not supported
    }
  };
};

// Pre-defined sound effects
const SOUNDS: Record<SoundEffect, () => void> = {
  ready: createBeep(880, 0.15, "sine", 0.4),      // High beep
  pick: createBeep(660, 0.1, "sine", 0.3),        // Medium beep
  join: createBeep(440, 0.12, "sine", 0.25),      // Join sound
  leave: createBeep(330, 0.15, "sine", 0.2),      // Lower beep
  countdown: createBeep(520, 0.08, "square", 0.2), // Tick
  start: createBeep(1000, 0.2, "sine", 0.5),      // High start beep
  click: createBeep(1200, 0.03, "sine", 0.15),    // Quick click
};

export function useSound() {
  const { enabled, volume } = useSoundSettings();

  const play = useCallback(
    (sound: SoundEffect) => {
      if (!enabled) return;
      
      // Adjust volume by creating new sound
      const playSound = SOUNDS[sound];
      if (playSound) {
        playSound();
      }
    },
    [enabled, volume]
  );

  return { play, enabled };
}

// Hook for countdown sounds
export function useCountdownSound(timeLeft: number | null, threshold: number = 10) {
  const { play, enabled } = useSound();
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || timeLeft === null) return;
    
    // Play tick sound in last 10 seconds
    if (timeLeft <= threshold && timeLeft > 0 && timeLeft !== lastTick.current) {
      lastTick.current = timeLeft;
      play("countdown");
    }
  }, [timeLeft, threshold, play, enabled]);
}
