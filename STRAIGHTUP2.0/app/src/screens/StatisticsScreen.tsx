import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { colors, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { StatTile } from '../components/StatTile';
import { DayAggregate } from '../types/domain';
import { getDayAggregates, StatsRange, summarizeRange } from '../storage/sessions';
import { formatHoursMinutes, weekdayShort, dayMonthLabel } from '../utils/dateUtils';

const RANGE_OPTIONS: { label: string; value: StatsRange }[] = [
  { label: 'Сегодня', value: 'today' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
];

function dayLabel(dateKey: string, range: StatsRange): string {
  const ms = new Date(`${dateKey}T00:00:00`).getTime();
  if (range === 'month') return dayMonthLabel(ms);
  return weekdayShort(ms);
}

export default function StatisticsScreen() {
  const [range, setRange] = useState<StatsRange>('week');
  const [days, setDays] = useState<DayAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: StatsRange) => {
    setLoading(true);
    try {
      const data = await getDayAggregates(r);
      setDays(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load]);

  useFocusEffect(
    useCallback(() => {
      load(range);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range]),
  );

  const summary = useMemo(() => summarizeRange(days), [days]);

  const correctnessData = useMemo(
    () =>
      days.map(d => ({
        value: Math.round(d.correctnessPct),
        label: dayLabel(d.date, range),
      })),
    [days, range],
  );

  const alertsData = useMemo(
    () =>
      days.map(d => ({
        value: d.alertCount,
        label: dayLabel(d.date, range),
        frontColor: colors.primary,
      })),
    [days, range],
  );

  const correctHoursData = useMemo(
    () =>
      days.map(d => ({
        value: Math.round(((d.usageMs * d.correctnessPct) / 100 / 3600000) * 10) / 10,
        label: dayLabel(d.date, range),
      })),
    [days, range],
  );

  const maxAlerts = Math.max(1, ...alertsData.map(d => d.value));
  const maxHours = Math.max(1, ...correctHoursData.map(d => d.value));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(range)} />}
    >
      <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />

      <View style={styles.tilesRow}>
        <StatTile
          label="Время использования"
          value={formatHoursMinutes(summary.usageMs)}
          icon="hourglass"
        />
        <StatTile
          label="Средний угол"
          value={`${summary.avgAngle.toFixed(1)}°`}
          icon="analytics"
          accentColor={colors.primary}
        />
        <StatTile
          label="Правильная осанка"
          value={`${Math.round(summary.correctnessPct)}%`}
          icon="checkmark-circle"
          accentColor={colors.success}
        />
        <StatTile
          label="Предупреждения"
          value={`${summary.alertCount}`}
          icon="alert-circle"
          accentColor={colors.danger}
        />
      </View>

      <Card style={styles.chartCard}>
        <Text style={typography.h3}>Правильная осанка (%)</Text>
        <View style={styles.chartWrap}>
          <LineChart
            data={correctnessData}
            height={160}
            color={colors.primary}
            thickness={3}
            hideRules={false}
            rulesColor={colors.border}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            maxValue={100}
            noOfSections={4}
            areaChart
            startFillColor={colors.primary}
            endFillColor={colors.primary}
            startOpacity={0.25}
            endOpacity={0.02}
            initialSpacing={12}
            spacing={Math.max(28, 260 / Math.max(1, correctnessData.length))}
            dataPointsColor={colors.primary}
          />
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <Text style={typography.h3}>Количество предупреждений</Text>
        <View style={styles.chartWrap}>
          <BarChart
            data={alertsData}
            height={160}
            barWidth={18}
            barBorderRadius={6}
            frontColor={colors.primary}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            noOfSections={4}
            maxValue={maxAlerts + 1}
            initialSpacing={12}
            spacing={Math.max(20, 220 / Math.max(1, alertsData.length))}
          />
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <Text style={typography.h3}>Время правильной осанки (ч)</Text>
        <View style={styles.chartWrap}>
          <LineChart
            data={correctHoursData}
            height={160}
            color={colors.success}
            thickness={3}
            hideRules={false}
            rulesColor={colors.border}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            maxValue={maxHours + 1}
            noOfSections={4}
            initialSpacing={12}
            spacing={Math.max(28, 260 / Math.max(1, correctHoursData.length))}
            dataPointsColor={colors.success}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  chartCard: { marginTop: spacing.md },
  chartWrap: { marginTop: spacing.sm, alignItems: 'flex-start' },
});
