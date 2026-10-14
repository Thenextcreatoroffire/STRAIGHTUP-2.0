/** Local-time date helpers (no timezone library needed for an MVP). */

export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ms: number, days: number): number {
  const d = new Date(ms);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** Monday-first weekday short label in Russian, e.g. "Пн". */
export const RU_WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export function weekdayShort(ms: number): string {
  return RU_WEEKDAY_SHORT[new Date(ms).getDay()];
}

export function dayMonthLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}`;
}

/** Returns an array of `count` date keys ending today (inclusive), oldest first. */
export function lastNDateKeys(count: number, endMs: number = Date.now()): string[] {
  const out: string[] = [];
  const start = startOfDay(endMs);
  for (let i = count - 1; i >= 0; i--) {
    out.push(toDateKey(addDays(start, -i)));
  }
  return out;
}

/** Start of the ISO-ish week (Monday) containing `ms`. */
export function startOfWeek(ms: number): number {
  const d = new Date(startOfDay(ms));
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(d.getTime(), diffToMonday);
}

export function startOfMonth(ms: number): number {
  const d = new Date(ms);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatHoursMinutes(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTimeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн назад`;
}

export function formatDateShort(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const months = [
    'янв', 'фев', 'мар', 'апр', 'май', 'июн',
    'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
  ];
  return `${d} ${months[(m ?? 1) - 1]}`;
}
