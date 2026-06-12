import { clsx, type ClassValue } from "clsx";
import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
} from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRehearsalDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, "EEEE, MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function getRehearsalCountdown(dateStr: string): string {
  try {
    const rehearsalDate = parseISO(dateStr);
    if (!isValid(rehearsalDate)) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(rehearsalDate);
    target.setHours(0, 0, 0, 0);

    const days = differenceInCalendarDays(target, today);

    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
    if (days === 0) return "Practice today!";
    if (days === 1) return "Practice in 1 day";
    return `Practice in ${days} days`;
  } catch {
    return "";
  }
}

export function isRehearsalPast(dateStr: string): boolean {
  try {
    const rehearsalDate = parseISO(dateStr);
    if (!isValid(rehearsalDate)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(rehearsalDate);
    target.setHours(0, 0, 0, 0);
    return differenceInCalendarDays(target, today) < 0;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
