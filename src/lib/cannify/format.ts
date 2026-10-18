import { format, isValid, parseISO } from "date-fns";
import { formatQty } from "./fifo";
import type { HistoryType } from "./types";

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return isoDate;
  return format(parsed, "d MMM yyyy");
}

export function formatDateTime(epochMs: number): string {
  const date = new Date(epochMs);
  if (!isValid(date)) return "—";
  return format(date, "d MMM yyyy, HH:mm");
}

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const parsed = parseISO(isoDate);
  if (!isValid(parsed)) return null;
  const today = parseISO(todayIso());
  return Math.round((parsed.getTime() - today.getTime()) / 86_400_000);
}

export { formatQty };

export function historyLabel(type: HistoryType): string {
  switch (type) {
    case "added":
      return "Added";
    case "consumed":
      return "Consumed";
    case "discarded":
      return "Discarded";
    case "restored":
      return "Restored";
  }
}
