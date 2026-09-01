/** Shared display formatters for EarnX-Finance. */
export const naira = (v: number | null | undefined) =>
  `₦${Number(v ?? 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const compactNumber = (v: number | null | undefined) =>
  Number(v ?? 0).toLocaleString("en-NG");

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const dateOnly = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
