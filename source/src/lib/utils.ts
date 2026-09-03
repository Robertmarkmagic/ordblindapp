import React from 'react';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Error handling utilities
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', 500);
  }
  
  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR', 500);
}

// Async utilities
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  }
}

// Date utilities

/**
 * Parse a server timestamp as UTC.
 *
 * Backend timestamps are UTC. A bare string like "2026-05-13 00:18:31"
 * (no timezone designator) is parsed by `new Date()` as LOCAL time, which
 * shifts the instant by the viewer's timezone offset and makes "today" /
 * "this week" counts off by one day. parseUTC normalizes such values to UTC.
 *
 * - Date input is returned as-is.
 * - Strings that already carry a timezone (`Z`, `+/-HH:MM`, or the short
 *   Postgres form `+/-HH` / `+/-HHMM`) are parsed natively (unambiguous).
 * - Naive strings ("YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS") are
 *   treated as UTC by appending `Z` (after normalizing the space separator).
 *
 * Always use this for server-timestamp parsing and date math; only format
 * to the viewer's local time at the moment of display.
 */
export function parseUTC(ts: Date | string): Date {
  if (ts instanceof Date) return ts;
  const s = String(ts).trim();
  // Already has an explicit timezone — Z, +/-HH:MM, or the short Postgres
  // form +/-HH (and +/-HHMM). Trailing minutes optional. Unambiguous.
  if (/[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(s)) return new Date(s);
  // Naive timestamp: normalize the space separator and pin to UTC.
  const iso = s.includes('T') ? s : s.replace(' ', 'T');
  return new Date(`${iso}Z`);
}

// Format utilities
export function formatDate(date: Date | string): string {
  const d = parseUTC(date);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
