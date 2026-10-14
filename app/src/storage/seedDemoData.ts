import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionSamplePoint, SessionSummary } from '../types/domain';
import { StorageKeys } from './keys';
import { addSessions, getAllSessions } from './sessions';
import { generateId } from '../utils/id';
import { addDays, startOfDay } from '../utils/dateUtils';

const DAYS_OF_HISTORY = 14;

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

function buildSamplePreview(
  durationMs: number,
  avgDeviation: number,
  alertEpisodes: number,
): SessionSamplePoint[] {
  const points = 48;
  const samples: SessionSamplePoint[] = [];
  const alertWindowCount = Math.min(alertEpisodes, 6);
  const alertWindows = new Set<number>();
  for (let i = 0; i < alertWindowCount; i++) {
    alertWindows.add(randInt(2, points - 3));
  }
  let base = 5 + Math.random() * 3;
  for (let i = 0; i < points; i++) {
    const offsetMs = Math.round((durationMs * i) / (points - 1));
    const inAlertWindow = alertWindows.has(i) || alertWindows.has(i - 1);
    const wander = randRange(-2, 2);
    const spike = inAlertWindow ? avgDeviation * randRange(1.5, 2.5) : 0;
    const pitch = base + wander + spike;
    samples.push({
      offsetMs,
      pitch: Math.round(pitch * 10) / 10,
      alert: inAlertWindow && Math.random() < 0.7 ? 1 : 0,
    });
  }
  return samples;
}

function buildSessionForDay(dayStartMs: number, demo: boolean): SessionSummary {
  // A plausible work session sometime during the day.
  const startHour = randInt(8, 17);
  const startedAt = dayStartMs + startHour * 3600000 + randInt(0, 59) * 60000;
  const durationMs = randInt(25, 180) * 60000;
  const endedAt = startedAt + durationMs;

  const correctnessPct = randRange(55, 96);
  const avgDeviation = randRange(3, 13);
  const alertEpisodes = Math.max(
    0,
    Math.round(((100 - correctnessPct) / 100) * randRange(3, 9)),
  );

  return {
    id: generateId('session'),
    startedAt,
    endedAt,
    sampleCount: Math.round(durationMs / 200),
    correctnessPct: Math.round(correctnessPct * 10) / 10,
    avgDeviation: Math.round(avgDeviation * 10) / 10,
    alertEpisodes,
    demo,
    samples: buildSamplePreview(durationMs, avgDeviation, alertEpisodes),
  };
}

/**
 * Populates AsyncStorage with ~2 weeks of plausible demo session history on
 * first launch, so Statistics / History / Achievements / Profile are never
 * empty on a fresh install. Idempotent - only runs once per install.
 */
export async function seedDemoHistoryIfNeeded(): Promise<void> {
  try {
    const alreadySeeded = await AsyncStorage.getItem(StorageKeys.seeded);
    if (alreadySeeded) return;

    const existing = await getAllSessions();
    if (existing.length > 0) {
      await AsyncStorage.setItem(StorageKeys.seeded, '1');
      return;
    }

    const today = startOfDay(Date.now());
    const sessions: SessionSummary[] = [];
    for (let i = DAYS_OF_HISTORY; i >= 1; i--) {
      const dayStart = addDays(today, -i);
      // Most days have one session; some busier days get two.
      const sessionsToday = Math.random() < 0.25 ? 2 : 1;
      // Occasionally skip a day entirely, for realism.
      if (Math.random() < 0.12) continue;
      for (let s = 0; s < sessionsToday; s++) {
        sessions.push(buildSessionForDay(dayStart, true));
      }
    }

    await addSessions(sessions);
    await AsyncStorage.setItem(StorageKeys.seeded, '1');
  } catch (e) {
    console.warn('[storage/seedDemoData] failed to seed demo history', e);
  }
}
