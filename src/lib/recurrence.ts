import { format } from "date-fns";
import { nl } from "date-fns/locale";

export type RecurrenceRule = "daily" | "weekly" | "monthly";

export function shiftDate(date: Date, rule: RecurrenceRule): Date {
  const d = new Date(date);
  if (rule === "daily") d.setDate(d.getDate() + 1);
  else if (rule === "weekly") d.setDate(d.getDate() + 7);
  else if (rule === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}

export function defaultEndDate(from: Date, rule: RecurrenceRule): Date {
  const d = new Date(from);
  if (rule === "daily") d.setDate(d.getDate() + 30);
  else if (rule === "weekly") d.setDate(d.getDate() + 84);
  else d.setMonth(d.getMonth() + 12);
  return d;
}

/** Returns up to maxItems upcoming dates (inclusive of endDate) as formatted strings. */
export function getRecurrencePreview(
  startDateStr: string,
  rule: RecurrenceRule,
  endDateStr: string,
  maxItems = 4
): string[] {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

  const results: string[] = [];
  let current = new Date(start);

  while (current <= end && results.length < maxItems) {
    results.push(format(current, "EEE d MMM", { locale: nl }));
    current = shiftDate(current, rule);
  }

  return results;
}
