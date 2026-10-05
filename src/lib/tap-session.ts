export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function getRemainingSeconds(timestamp: string | null | undefined): number {
  if (!timestamp) return 0;
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.ceil((value - Date.now()) / 1000));
}