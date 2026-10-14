import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { ProgressBar } from '../components/ProgressBar';
import { achievementDefs } from '../data/achievementDefs';
import { AchievementProgress } from '../types/domain';
import { getAchievementProgress } from '../storage/achievements';

type FilterValue = 'all' | 'unlocked' | 'locked';

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Полученные', value: 'unlocked' },
  { label: 'Заблокированные', value: 'locked' },
];

export default function AchievementsScreen() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [progress, setProgress] = useState<AchievementProgress[]>([]);

  const load = useCallback(async () => {
    const result = await getAchievementProgress();
    setProgress(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const items = useMemo(() => {
    return achievementDefs
      .map(def => ({ def, progress: progress.find(p => p.id === def.id) }))
      .filter(({ progress: p }) => {
        if (filter === 'all') return true;
        if (filter === 'unlocked') return p?.unlocked;
        return !p?.unlocked;
      });
  }, [filter, progress]);

  const unlockedCount = progress.filter(p => p.unlocked).length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[typography.caption, styles.summary]}>
        Получено {unlockedCount} из {achievementDefs.length}
      </Text>
      <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      <View style={styles.grid}>
        {items.map(({ def, progress: p }) => {
          const unlocked = Boolean(p?.unlocked);
          const pct = p?.progress ?? 0;
          return (
            <Card key={def.id} style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: unlocked ? colors.primaryLight : colors.border },
                ]}
              >
                <Icon name={def.icon} size={22} color={unlocked ? colors.primary : colors.textMuted} />
              </View>
              <Text style={[typography.bodyBold, !unlocked && styles.mutedText]}>{def.title}</Text>
              {unlocked ? (
                <View style={styles.unlockedBadge}>
                  <Icon name="checkmark" size={12} color={colors.success} />
                  <Text style={styles.unlockedText}>Получено</Text>
                </View>
              ) : (
                <>
                  <Text style={[typography.caption, styles.lockedDescription]}>{def.description}</Text>
                  <View style={styles.progressWrap}>
                    <ProgressBar progress={pct} height={5} />
                    <Text style={styles.progressText}>{Math.round(pct * 100)}%</Text>
                  </View>
                </>
              )}
            </Card>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  summary: { marginBottom: spacing.xs },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  badgeCard: {
    flexBasis: '48%',
    marginBottom: spacing.sm,
  },
  badgeCardLocked: { opacity: 0.85 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  mutedText: { color: colors.textMuted },
  lockedDescription: { marginTop: 4 },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  unlockedText: { color: colors.success, fontSize: 12, fontWeight: '600', marginLeft: 4 },
  progressWrap: { marginTop: spacing.xs },
  progressText: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
