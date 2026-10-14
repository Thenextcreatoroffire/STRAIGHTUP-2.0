import { achievementDefs } from '../data/achievementDefs';
import { AchievementProgress, SessionSummary } from '../types/domain';
import { getAllSessions } from './sessions';
import { toDateKey, addDays } from '../utils/dateUtils';

const HUNDRED_HOURS_MS = 100 * 60 * 60 * 1000;

function longestCurrentStreak(dateKeys: Set<string>): number {
  // Best run of consecutive calendar days with at least one session,
  // anywhere in history (demo-seeded history may not include "today").
  const sorted = Array.from(dateKeys).sort();
  let best = 0;
  let running = 0;
  let prev: string | null = null;
  for (const key of sorted) {
    if (prev) {
      const prevDate = new Date(`${prev}T00:00:00`).getTime();
      const expectedNext = toDateKey(addDays(prevDate, 1));
      running = expectedNext === key ? running + 1 : 1;
    } else {
      running = 1;
    }
    best = Math.max(best, running);
    prev = key;
  }
  // Streak ending today, for a slightly nicer "current streak" feel.
  let todayStreak = 0;
  let d = Date.now();
  while (dateKeys.has(toDateKey(d))) {
    todayStreak++;
    d = addDays(d, -1);
  }
  return Math.max(best, todayStreak);
}

function computeStats(sessions: SessionSummary[]) {
  const totalUsageMs = sessions.reduce((s, x) => s + Math.max(0, x.endedAt - x.startedAt), 0);
  const distinctDays = new Set(sessions.map(s => toDateKey(s.startedAt)));
  const hasZeroAlertSession = sessions.some(
    s => s.sampleCount > 0 && s.alertEpisodes === 0,
  );
  const streak = longestCurrentStreak(distinctDays);
  return { totalUsageMs, distinctDays, hasZeroAlertSession, streak };
}

export async function getAchievementProgress(): Promise<AchievementProgress[]> {
  const sessions = await getAllSessions();
  const stats = computeStats(sessions);

  return achievementDefs.map(def => {
    switch (def.id) {
      case 'no_alerts_session':
        return {
          id: def.id,
          unlocked: stats.hasZeroAlertSession,
          progress: stats.hasZeroAlertSession ? 1 : 0,
        };
      case 'streak_7':
        return {
          id: def.id,
          unlocked: stats.streak >= 7,
          progress: Math.min(1, stats.streak / 7),
        };
      case 'hours_100':
        return {
          id: def.id,
          unlocked: stats.totalUsageMs >= HUNDRED_HOURS_MS,
          progress: Math.min(1, stats.totalUsageMs / HUNDRED_HOURS_MS),
        };
      case 'days_30':
        return {
          id: def.id,
          unlocked: stats.distinctDays.size >= 30,
          progress: Math.min(1, stats.distinctDays.size / 30),
        };
      default:
        return { id: def.id, unlocked: false, progress: 0 };
    }
  });
}
