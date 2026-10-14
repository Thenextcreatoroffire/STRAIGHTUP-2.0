import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { HistoryStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { SegmentedControl } from '../components/SegmentedControl';
import { DayAggregate } from '../types/domain';
import { getDayAggregates, StatsRange } from '../storage/sessions';
import { formatDateShort, formatHoursMinutes } from '../utils/dateUtils';

const RANGE_OPTIONS: { label: string; value: StatsRange }[] = [
  { label: 'Сегодня', value: 'today' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
];

type Nav = NativeStackNavigationProp<HistoryStackParamList, 'History'>;

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [range, setRange] = useState<StatsRange>('week');
  const [days, setDays] = useState<DayAggregate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: StatsRange) => {
    setLoading(true);
    try {
      const data = await getDayAggregates(r);
      setDays([...data].reverse());
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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </View>

      <View style={styles.tableHeader}>
        <Text style={[typography.captionBold, styles.colDate]}>Дата</Text>
        <Text style={[typography.captionBold, styles.colUsage]}>Использ.</Text>
        <Text style={[typography.captionBold, styles.colPosture]}>Осанка</Text>
        <Text style={[typography.captionBold, styles.colAlerts]}>Предупр.</Text>
      </View>

      <FlatList
        data={days}
        keyExtractor={item => item.date}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(range)} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={[typography.caption, styles.emptyText]}>Нет данных за этот период</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const hasData = item.sessionCount > 0;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('DayDetail', { date: item.date })}
              activeOpacity={0.7}
            >
              <Text style={[typography.body, styles.colDate]}>{formatDateShort(item.date)}</Text>
              <Text style={[typography.body, styles.colUsage]}>
                {hasData ? formatHoursMinutes(item.usageMs) : '—'}
              </Text>
              <Text
                style={[
                  typography.bodyBold,
                  styles.colPosture,
                  { color: hasData ? (item.correctnessPct >= 70 ? colors.success : colors.danger) : colors.textMuted },
                ]}
              >
                {hasData ? `${Math.round(item.correctnessPct)}%` : '—'}
              </Text>
              <Text style={[typography.body, styles.colAlerts]}>{hasData ? item.alertCount : '—'}</Text>
              <Icon name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { marginBottom: spacing.sm },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xxs,
  },
  colDate: { flex: 1.1 },
  colUsage: { flex: 1 },
  colPosture: { flex: 0.9, textAlign: 'right' },
  colAlerts: { flex: 0.9, textAlign: 'right' },
  listContent: { paddingBottom: spacing.xxxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  emptyText: { textAlign: 'center', marginTop: spacing.xl },
});
