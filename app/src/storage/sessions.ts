import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayAggregate, SessionSummary } from '../types/domain';
import { StorageKeys } from './keys';
import {
  lastNDateKeys,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from '../utils/dateUtils';

const MAX_STORED_SESSIONS = 3000;

export type StatsRange = 'today' | 'week' | 'month';

/** Reads every persisted session summary, oldest first. */
export async function getAllSessions(): Promise<SessionSummary[]> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.sessions);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SessionSummary[];
  } catch (e) {
    console.warn('[storage/sessions] failed to read sessions', e);
    return [];
  }
}

async function writeAllSessions(sessions: SessionSummary[]): Promise<void> {
  const trimmed =
    sessions.length > MAX_STORED_SESSIONS
      ? sessions.slice(sessions.length - MAX_STORED_SESSIONS)
      : sessions;
  await AsyncStorage.setItem(StorageKeys.sessions, JSON.stringify(trimmed));
}

/** Appends a completed session summary to the local session log. */
export async function addSession(session: SessionSummary): Promise<void> {
  const all = await getAllSessions();
  all.push(session);
  await writeAllSessions(all);
}

/** Bulk-append, used by the demo-history seeder. */
export async function addSessions(sessions: SessionSummary[]): Promise<void> {
  const all = await getAllSessions();
  await writeAllSessions([...all, ...sessions]);
}

export async function clearAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(StorageKeys.sessions);
}

/** Sessions whose startedAt falls within [fromMs, toMs). */
export function filterSessionsInRange(
  sessions: SessionSummary[],
  fromMs: number,
  toMs: number,
): SessionSummary[] {
  return sessions.filter(s => s.startedAt >= fromMs && s.startedAt < toMs);
}

/** Groups sessions into one DayAggregate per calendar day they started on. */
export function aggregateByDay(sessions: SessionSummary[]): Map<string, DayAggregate> {
  const map = new Map<string, DayAggregate>();
  for (const s of sessions) {
    const key = toDateKey(s.startedAt);
    const usageMs = Math.max(0, s.endedAt - s.startedAt);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        date: key,
        usageMs,
        avgAngle: s.avgDeviation,
        correctnessPct: s.correctnessPct,
        alertCount: s.alertEpisodes,
        sessionCount: 1,
      });
      continue;
    }
    // weighted merge across multiple sessions on the same day
    const totalUsage = existing.usageMs + usageMs;
    const wPrev = existing.usageMs / (totalUsage || 1);
    const wNew = usageMs / (totalUsage || 1);
    existing.avgAngle = existing.avgAngle * wPrev + s.avgDeviation * wNew;
    existing.correctnessPct = existing.correctnessPct * wPrev + s.correctnessPct * wNew;
    existing.usageMs = totalUsage;
    existing.alertCount += s.alertEpisodes;
    existing.sessionCount += 1;
  }
  return map;
}

function emptyDayAggregate(date: string): DayAggregate {
  return { date, usageMs: 0, avgAngle: 0, correctnessPct: 0, alertCount: 0, sessionCount: 0 };
}

/**
 * Returns one DayAggregate per day for the given range, oldest first,
 * filled with zeroed placeholders for days with no sessions so charts
 * always have a full axis (today: 1 entry, week: 7 entries Mon-Sun-ish
 * ending today, month: entries for every day since the 1st).
 */
export async function getDayAggregates(range: StatsRange): Promise<DayAggregate[]> {
  const sessions = await getAllSessions();
  const byDay = aggregateByDay(sessions);
  const now = Date.now();

  let keys: string[];
  if (range === 'today') {
    keys = [toDateKey(now)];
  } else if (range === 'week') {
    const weekStart = startOfWeek(now);
    keys = [];
    for (let i = 0; i < 7; i++) {
      keys.push(toDateKey(weekStart + i * 86400000));
    }
  } else {
    const monthStart = startOfMonth(now);
    const daysSoFar = Math.floor((now - monthStart) / 86400000) + 1;
    keys = [];
    for (let i = 0; i < daysSoFar; i++) {
      keys.push(toDateKey(monthStart + i * 86400000));
    }
  }

  return keys.map(k => byDay.get(k) ?? emptyDayAggregate(k));
}

/** Convenience: aggregates over the trailing N days ending today (used by History/Profile). */
export async function getTrailingDayAggregates(days: number): Promise<DayAggregate[]> {
  const sessions = await getAllSessions();
  const byDay = aggregateByDay(sessions);
  const keys = lastNDateKeys(days);
  return keys.map(k => byDay.get(k) ?? emptyDayAggregate(k));
}

export async function getDayAggregate(dateKey: string): Promise<DayAggregate> {
  const sessions = await getAllSessions();
  const byDay = aggregateByDay(sessions);
  return byDay.get(dateKey) ?? emptyDayAggregate(dateKey);
}

export async function getSessionsForDay(dateKey: string): Promise<SessionSummary[]> {
  const sessions = await getAllSessions();
  return sessions.filter(s => toDateKey(s.startedAt) === dateKey);
}

/** Rolls a range's DayAggregates up into one summary object for the stat tiles. */
export function summarizeRange(days: DayAggregate[]) {
  const usageMs = days.reduce((sum, d) => sum + d.usageMs, 0);
  const withData = days.filter(d => d.sessionCount > 0);
  const avgAngle = withData.length
    ? withData.reduce((sum, d) => sum + d.avgAngle * d.usageMs, 0) / (usageMs || 1)
    : 0;
  const correctnessPct = withData.length
    ? withData.reduce((sum, d) => sum + d.correctnessPct * d.usageMs, 0) / (usageMs || 1)
    : 0;
  const alertCount = days.reduce((sum, d) => sum + d.alertCount, 0);
  return { usageMs, avgAngle, correctnessPct, alertCount };
}

export async function getAllTimeSummary() {
  const sessions = await getAllSessions();
  const usageMs = sessions.reduce((sum, s) => sum + Math.max(0, s.endedAt - s.startedAt), 0);
  const correctnessPct = sessions.length
    ? sessions.reduce((sum, s) => sum + s.correctnessPct * (s.endedAt - s.startedAt), 0) /
      (usageMs || 1)
    : 0;
  const alertCount = sessions.reduce((sum, s) => sum + s.alertEpisodes, 0);
  const distinctDays = new Set(sessions.map(s => toDateKey(s.startedAt)));
  return {
    usageMs,
    correctnessPct,
    alertCount,
    sessionCount: sessions.length,
    distinctDayCount: distinctDays.size,
  };
}
