import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatRelativeTime(input: string | Date) {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diff) >= ms || unit === 'minute') {
      return formatter.format(Math.round(diff / ms), unit);
    }
  }

  return 'just now';
}

export function noteLabel(title: string) {
  return title.trim() || 'Untitled note';
}

export function notePreview(content: string) {
  const preview = content.replace(/\s+/g, ' ').trim();
  return preview || 'No additional text';
}
