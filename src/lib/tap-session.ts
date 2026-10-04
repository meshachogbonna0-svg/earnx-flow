/**
 * Tap Session Configuration Layer
 * Prepared to consume admin-defined settings for each level (0-7).
 * This layer acts as a bridge between frontend UI and backend configuration.
 */

export type TapSessionConfig = {
  sessionDuration: number; // in seconds
  cooldownDuration: number; // in seconds
  maxTapsPerSession: number | null; // null = unlimited
  tapReward: number;
  enabled: boolean;
};

export type TapSessionLevel = {
  [key in 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7]: TapSessionConfig;
};

/**
 * Default fallback configuration for each level.
 * When backend admin settings are not available, these defaults will be used.
 * The admin can override all of these values.
 */
export const defaultTapSessionConfig: TapSessionLevel = {
  0: {
    sessionDuration: 120, // 2 minutes
    cooldownDuration: 3600, // 1 hour
    maxTapsPerSession: null, // unlimited
    tapReward: 0.5,
    enabled: true,
  },
  1: {
    sessionDuration: 180, // 3 minutes
    cooldownDuration: 1800, // 30 minutes
    maxTapsPerSession: 200,
    tapReward: 1.0,
    enabled: true,
  },
  2: {
    sessionDuration: 240, // 4 minutes
    cooldownDuration: 1200, // 20 minutes
    maxTapsPerSession: 300,
    tapReward: 1.5,
    enabled: true,
  },
  3: {
    sessionDuration: 300, // 5 minutes
    cooldownDuration: 900, // 15 minutes
    maxTapsPerSession: 400,
    tapReward: 2.0,
    enabled: true,
  },
  4: {
    sessionDuration: 300, // 5 minutes
    cooldownDuration: 600, // 10 minutes
    maxTapsPerSession: 500,
    tapReward: 2.5,
    enabled: true,
  },
  5: {
    sessionDuration: 360, // 6 minutes
    cooldownDuration: 600, // 10 minutes
    maxTapsPerSession: 600,
    tapReward: 3.0,
    enabled: true,
  },
  6: {
    sessionDuration: 360, // 6 minutes
    cooldownDuration: 300, // 5 minutes
    maxTapsPerSession: 700,
    tapReward: 3.5,
    enabled: true,
  },
  7: {
    sessionDuration: 420, // 7 minutes
    cooldownDuration: 300, // 5 minutes
    maxTapsPerSession: 800,
    tapReward: 4.0,
    enabled: true,
  },
};

/**
 * Get tap session configuration for a specific level.
 * In the future, this should fetch from the platform_settings table via RPC.
 * For now, it returns fallback defaults.
 *
 * @param level - User's current level (0-7)
 * @returns Configuration for that level
 */
export function getTapSessionConfig(level: number): TapSessionConfig {
  const lvl = Math.max(0, Math.min(7, level)) as keyof TapSessionLevel;
  return defaultTapSessionConfig[lvl];
}

/**
 * Format seconds into MM:SS or HH:MM:SS countdown string.
 * @param seconds - Total seconds remaining
 * @returns Formatted countdown string
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Calculate remaining seconds from a future timestamp.
 * Returns 0 if the timestamp is in the past.
 *
 * @param untilTimestamp - ISO string or Date timestamp
 * @returns Remaining seconds
 */
export function getRemainingSeconds(untilTimestamp: string | null | undefined): number {
  if (!untilTimestamp) return 0;
  const ms = new Date(untilTimestamp).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}
