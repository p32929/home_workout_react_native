import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MONTH_SHORT } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(key: string): string {
  const date = parseDateKey(key);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatChartLabel(key: string): string {
  const date = parseDateKey(key);
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

export function computeStreak(dates: string[]): { current: number; best: number } {
  if (dates.length === 0) return { current: 0, best: 0 };

  const unique = [...new Set(dates)];
  const dateSet = new Set(unique);
  const sorted = [...unique].sort();

  // Current streak (backwards from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDateKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = formatDateKey(yesterday);

  let current = 0;
  const startKey = dateSet.has(todayKey)
    ? todayKey
    : dateSet.has(yesterdayKey)
      ? yesterdayKey
      : null;

  if (startKey) {
    const check = parseDateKey(startKey);
    while (dateSet.has(formatDateKey(check))) {
      current++;
      check.setDate(check.getDate() - 1);
    }
  }

  // Best streak (sliding window on sorted dates)
  let best = current;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseDateKey(sorted[i - 1]);
    const curr = parseDateKey(sorted[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      streak++;
      if (streak > best) best = streak;
    } else if (diff > 1) {
      streak = 1;
    }
  }

  return { current, best };
}
