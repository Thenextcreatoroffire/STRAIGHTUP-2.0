import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { LineChart } from 'react-native-gifted-charts';
import { HistoryStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { StatTile } from '../components/StatTile';
import { DayAggregate, SessionSummary } from '../types/domain';
import { getDayAggregate, getSessionsForDay } from '../storage/sessions';
import { formatHoursMinutes, startOfWeek, toDateKey, weekdayShort } from '../utils/dateUtils';

type Route = RouteProp<HistoryStackParamList, 'DayDetail'>;

interface ChartPoint {
  value: number;
  label: string;
  dataPointColor: string;
  dataPointRadius: number;
}

function buildWeekStrip(dateKey: string): string[] {
  const anchor = new Date(`${dateKey}T00:00:00`).getTime();
  const weekStart = startOfWeek(anchor);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(toDateKey(weekStart + i * 86400000));
  }
  return days;
}

function buildChartPoints(sessions: SessionSummary[]): ChartPoint[] {
  const points: { absMs: number; pitch: number; alert: 0 | 1 }[] = [];
  for (const session of sessions) {
    for (const sample of session.samples ?? []) {
      points.push({
        absMs: session.startedAt + sample.offsetMs,
        pitch: sample.pitch,
        alert: sample.alert,
      });
    }
  }
  points.sort((a, b) => a.absMs - b.absMs);

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  return points.map((p, i) => {
    const d = new Date(p.absMs);
    const label =
      i % labelEvery === 0
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : '';
    return {
      value: Math.round(p.pitch * 10) / 10,
      label,
      dataPointColor: p.alert ? colors.danger : colors.primary,
      dataPointRadius: p.alert ? 4 : 2,
    };
  });
}

export default function DayDetailScreen() {
  const route = useRoute<Route>();
  const [selectedDate, setSelectedDate] = useState(route.params.date);
  const [aggregate, setAggregate] = useState<DayAggregate | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (dateKey: string) => {
    setLoading(true);
    try {
      const [agg, sess] = await Promise.all([getDayAggregate(dateKey), getSessionsForDay(dateKey)]);
      setAggregate(agg);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(selectedDate);
  }, [selectedDate, load]);

  useFocusEffect(
    useCallback(() => {
      load(selectedDate);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate]),
  );

  const weekStrip = useMemo(() => buildWeekStrip(selectedDate), [selectedDate]);
  const chartPoints = useMemo(() => buildChartPoints(sessions), [sessions]);
  const todayKey = toDateKey(Date.now());

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.strip}>
        {weekStrip.map(dateKey => {
          const dayMs = new Date(`${dateKey}T00:00:00`).getTime();
          const selected = dateKey === selectedDate;
          const isFuture = dateKey > todayKey;
          return (
            <TouchableOpacity
              key={dateKey}
              disabled={isFuture}
              style={[styles.dayChip, selected && styles.dayChipSelected, isFuture && styles.dayChipDisabled]}
              onPress={() => setSelectedDate(dateKey)}
            >
              <Text style={[typography.caption, selected && styles.dayChipTextSelected]}>
                {weekdayShort(dayMs)}
              </Text>
              <Text
                style={[
                  typography.bodyBold,
                  selected && styles.dayChipTextSelected,
                  isFuture && styles.dayChipTextDisabled,
                ]}
              >
                {new Date(dayMs).getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.tilesRow}>
        <StatTile
          label="Время использования"
          value={aggregate && aggregate.sessionCount > 0 ? formatHoursMinutes(aggregate.usageMs) : '—'}
          icon="hourglass"
        />
        <StatTile
          label="Средний угол"
          value={aggregate && aggregate.sessionCount > 0 ? `${aggregate.avgAngle.toFixed(1)}°` : '—'}
          icon="analytics"
        />
        <StatTile
          label="Правильная осанка"
          value={aggregate && aggregate.sessionCount > 0 ? `${Math.round(aggregate.correctnessPct)}%` : '—'}
          icon="checkmark-circle"
          accentColor={colors.success}
        />
        <StatTile
          label="Предупреждения"
          value={aggregate ? `${aggregate.alertCount}` : '0'}
          icon="alert-circle"
          accentColor={colors.danger}
        />
      </View>

      <Card style={styles.chartCard}>
        <Text style={typography.h3}>Угол наклона в течение дня</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={typography.caption}>Норма</Text>
          <View style={[styles.legendDot, { backgroundColor: colors.danger, marginLeft: spacing.sm }]} />
          <Text style={typography.caption}>Предупреждение</Text>
        </View>
        {chartPoints.length > 0 ? (
          <View style={styles.chartWrap}>
            <LineChart
              data={chartPoints}
              height={180}
              thickness={2}
              color={colors.primary}
              hideRules={false}
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
              noOfSections={4}
              initialSpacing={8}
              spacing={Math.max(6, 320 / Math.max(1, chartPoints.length))}
              curved
            />
          </View>
        ) : (
          <Text style={[typography.caption, styles.emptyChart]}>
            {loading ? 'Загрузка...' : 'Нет данных за этот день'}
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  dayChip: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    minWidth: 40,
  },
  dayChipSelected: { backgroundColor: colors.primary },
  dayChipDisabled: { opacity: 0.4 },
  dayChipTextSelected: { color: colors.white },
  dayChipTextDisabled: { color: colors.textMuted },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  chartCard: { marginTop: spacing.md },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xxs },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  chartWrap: { marginTop: spacing.sm, alignItems: 'flex-start' },
  emptyChart: { textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
});
