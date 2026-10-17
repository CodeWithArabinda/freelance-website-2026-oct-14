import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format integer minor units (cents) into user-friendly USD currency string.
 * Example: 10000 -> "$100.00"
 */
export function formatCurrency(amountMinor: number): string {
  const dollars = (amountMinor / 100).toFixed(2);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(dollars));
}

export function formatDate(dateStringOrDate: string | Date | null | undefined): string {
  if (!dateStringOrDate) return "N/A";
  const date = new Date(dateStringOrDate);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
