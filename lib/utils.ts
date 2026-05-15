import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind sınıflarını koşullu birleştirir ve çakışmaları çözer. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Sayıyı Türkçe binlik ayraçla, verilen ondalıkla biçimlendirir. */
export function fmt(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Değeri [min, max] aralığına kıstırır. */
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
