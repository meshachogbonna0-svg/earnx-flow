import { useEffect, useState, useCallback, useRef } from "react";
import { getTapSessionConfig, getRemainingSeconds } from "@/lib/tap-session";

export type TapSessionState = "idle" | "active" | "ended" | "cooldown";

export interface TapSessionData {
  state: TapSessionState;
  sessionEndTime: string | null;
  cooldownEndTime: string | null;
  sessionSecondsRemaining: number;
  cooldownSecondsRemaining: number;
  isSessionActive: boolean;
  isCooldownActive: boolean;
  canStartSession: boolean;
}

/**
 * Custom hook to manage tap session lifecycle and countdown timers.
 * Handles:
 * - Session start/end lifecycle
 * - Countdown timer ticks (every second)
 * - Cooldown management
 * - Level-specific configuration
 *
 * @param userLevel - User's current level (0-7)
 * @returns TapSessionData and session control functions
 */
export function useTapSession(userLevel: number) {
  const [sessionEndTime, setSessionEndTime] = useState<string | null>(null);
  const [cooldownEndTime, setCooldownEndTime] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Get current level's configuration
  const config = getTapSessionConfig(userLevel);

  // Calculate current state and remaining times
  const sessionSecondsRemaining = getRemainingSeconds(sessionEndTime);
  const cooldownSecondsRemaining = getRemainingSeconds(cooldownEndTime);

  const isSessionActive = sessionSecondsRemaining > 0;
  const isCooldownActive = cooldownSecondsRemaining > 0;
  const canStartSession = !isSessionActive && !isCooldownActive && config.enabled;

  const state: TapSessionState = isCooldownActive
    ? "cooldown"
    : isSessionActive
      ? "active"
      : sessionEndTime
        ? "ended"
        : "idle";

  /**
   * Start a new tapping session.
   * Sets the session end time based on configured duration.
   */
  const startSession = useCallback(() => {
    if (!canStartSession) return;

    const now = new Date();
    const endTime = new Date(now.getTime() + config.sessionDuration * 1000);
    setSessionEndTime(endTime.toISOString());
    // Clear any previous cooldown
    setCooldownEndTime(null);
  }, [canStartSession, config.sessionDuration]);

  /**
   * End the current session and start cooldown.
   * Called when session timer reaches zero or user explicitly ends session.
   */
  const endSession = useCallback(() => {
    setSessionEndTime(null);
    const now = new Date();
    const cooldownEnd = new Date(now.getTime() + config.cooldownDuration * 1000);
    setCooldownEndTime(cooldownEnd.toISOString());
  }, [config.cooldownDuration]);

  /**
   * Reset both session and cooldown (admin/debug only).
   */
  const resetSession = useCallback(() => {
    setSessionEndTime(null);
    setCooldownEndTime(null);
  }, []);

  // Set up interval to tick every second for countdown updates
  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Auto-end session when timer reaches zero
  useEffect(() => {
    if (isSessionActive && sessionSecondsRemaining === 0 && sessionEndTime) {
      endSession();
    }
  }, [tick, isSessionActive, sessionSecondsRemaining, sessionEndTime, endSession]);

  return {
    // State
    state,
    sessionEndTime,
    cooldownEndTime,
    sessionSecondsRemaining,
    cooldownSecondsRemaining,
    isSessionActive,
    isCooldownActive,
    canStartSession,

    // Config
    config,

    // Actions
    startSession,
    endSession,
    resetSession,
  };
}
