import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { HomeStackParamList } from '../navigation/types';
import { usePosture } from '../context/PostureContext';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { MetricRow } from '../components/MetricRow';
import { formatDuration, formatTimeAgo } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const posture = usePosture();
  const [starting, setStarting] = useState(false);

  const {
    connectionState,
    connectedDeviceName,
    live,
    calibrating,
    isMonitoring,
    sessionElapsedMs,
    sessionCorrectnessPct,
    sessionAlertCount,
    lastAlertAt,
    startMonitoring,
    stopMonitoring,
    demoMode,
  } = posture;

  const isAlert = isMonitoring && live.alert === 1;
  const isDeviating = live.status === 'DEVIATING';

  const batteryLabel = useMemo(() => {
    if (live.batt == null || live.batt < 0) return '—';
    return `${Math.round(live.batt)}%`;
  }, [live.batt]);

  const connectionLabel = useMemo(() => {
    if (connectionState === 'connected') {
      return `Устройство · Подключено · ${batteryLabel}`;
    }
    if (connectionState === 'connecting') return 'Устройство · Подключение...';
    return 'Не подключено';
  }, [connectionState, batteryLabel]);

  const handleToggleMonitoring = async () => {
    if (isMonitoring) {
      await stopMonitoring();
      return;
    }
    setStarting(true);
    try {
      const result = await startMonitoring();
      if (!result.ok) {
        if (result.reason === 'no_device') {
          Alert.alert(
            'Устройство не выбрано',
            'Сначала подключите устройство или включите демо-режим.',
            [
              { text: 'Отмена', style: 'cancel' },
              { text: 'К устройству', onPress: () => navigation.navigate('Device') },
            ],
          );
        } else {
          Alert.alert('Не удалось подключиться', 'Проверьте, что устройство включено и находится рядом.');
        }
      }
    } finally {
      setStarting(false);
    }
  };

  const correctnessColor = sessionCorrectnessPct >= 70 ? colors.success : colors.danger;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        activeOpacity={connectionState === 'connected' ? 1 : 0.7}
        onPress={() => {
          if (connectionState !== 'connected') navigation.navigate('Device');
        }}
      >
        <Card style={styles.connectionCard}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  connectionState === 'connected'
                    ? colors.success
                    : connectionState === 'connecting'
                    ? colors.warning
                    : colors.textMuted,
              },
            ]}
          />
          <Text style={[typography.body, styles.connectionText]}>
            {connectionLabel}
            {connectedDeviceName ? ` · ${connectedDeviceName}` : ''}
          </Text>
          {demoMode ? (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>ДЕМО</Text>
            </View>
          ) : null}
          {connectionState !== 'connected' && (
            <Icon name="chevron-forward" size={18} color={colors.textMuted} />
          )}
        </Card>
      </TouchableOpacity>

      <PrimaryButton
        style={styles.mainButton}
        label={
          calibrating
            ? 'Калибровка...'
            : isMonitoring
            ? 'Остановить мониторинг'
            : 'Начать мониторинг'
        }
        variant={isMonitoring ? 'danger' : 'primary'}
        loading={starting || calibrating}
        onPress={handleToggleMonitoring}
      />

      <Card style={[styles.postureCard, isAlert ? styles.postureCardAlert : styles.postureCardGood]}>
        {isAlert ? (
          <>
            <Icon name="warning" size={40} color={colors.danger} />
            <Text style={[typography.h3, styles.alertHeading]}>Вы слишком долго сидите неправильно</Text>
            <Text style={[typography.caption, styles.centerText]}>Исправьте положение спины</Text>
            <View style={styles.vibrationRow}>
              <Icon name="phone-portrait" size={16} color={colors.danger} />
              <Text style={[typography.captionBold, styles.vibrationLabel]}>Вибрация</Text>
            </View>
            <Text style={[typography.bodyBold, styles.angleText]}>
              Угол наклона {live.pitch.toFixed(1)}°
            </Text>
          </>
        ) : (
          <>
            <Icon name="body" size={40} color={colors.success} />
            <Text style={[typography.h3, styles.goodHeading]}>
              {!isMonitoring ? 'Мониторинг не запущен' : live.status === 'SENSOR_ERROR' ? 'Ошибка датчика' : isDeviating ? 'Положение отклонено' : calibrating ? 'Калибровка' : 'Положение в пределах порога'}
            </Text>
            <Text style={[typography.bodyBold, styles.angleText]}>
              Угол наклона {isMonitoring ? live.pitch.toFixed(1) : '—'}°
            </Text>
          </>
        )}
      </Card>

      <Card style={styles.metricsCard}>
        <Text style={[typography.h3, { marginBottom: spacing.sm }]}>Положение трёх датчиков</Text>
        {([1, 2, 3] as const).map((id) => {
          const reading = live.sensors.find(s => s.id === id);
          const label = ['Верх спины', 'Середина спины', 'Низ спины'][id - 1];
          return (
            <View key={id} style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={typography.bodyBold}>{label}</Text>
              <Text style={typography.body}>
                {reading && reading.valid
                  ? `Pitch ${reading.pitch.toFixed(1)}°  ·  Roll ${reading.roll.toFixed(1)}°`
                  : 'Нет корректных данных'}
              </Text>
              <Text style={typography.caption}>
                {reading && reading.valid ? `Отклонение от эталона: ${reading.deviation.toFixed(1)}°` : 'Проверьте датчик'}
              </Text>
            </View>
          );
        })}
        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
          {isDeviating ? `Отклонение длится ${Math.floor(live.badForSec)} из 20 секунд` :
            live.status === 'ALERT' ? 'Предупреждение: отклонение более 20 секунд' :
            live.status === 'SENSOR_ERROR' ? 'Ошибка подключения датчиков' :
            calibrating ? 'Запоминаем исходное положение (7 секунд)' : 'Статус: ' + live.status}
        </Text>
      </Card>
      <Card style={styles.metricsCard}>
        <MetricRow
          icon="hourglass"
          label="Время использования"
          value={formatDuration(sessionElapsedMs)}
        />
        <MetricRow
          icon="checkmark-circle"
          label="Корректность осанки"
          value={isMonitoring ? `${Math.round(sessionCorrectnessPct)}%` : '—'}
          valueColor={isMonitoring ? correctnessColor : colors.textMuted}
        />
        <MetricRow
          icon="alert-circle"
          label="Предупреждения"
          value={`${sessionAlertCount}`}
          sublabel={lastAlertAt ? `Последнее ${formatTimeAgo(lastAlertAt)}` : undefined}
          last
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  connectionText: { flex: 1 },
  demoBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  demoBadgeText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  mainButton: { marginBottom: spacing.md },
  postureCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  postureCardGood: { backgroundColor: colors.card },
  postureCardAlert: { backgroundColor: colors.dangerLight },
  goodHeading: { color: colors.success, marginTop: spacing.sm },
  alertHeading: { color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  centerText: { textAlign: 'center' },
  angleText: { marginTop: spacing.sm },
  vibrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  vibrationLabel: { color: colors.danger, marginLeft: 6 },
  metricsCard: { marginBottom: spacing.md },
});
