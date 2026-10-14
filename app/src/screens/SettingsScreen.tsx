import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { ToggleRow } from '../components/ToggleRow';
import { SimpleSlider } from '../components/SimpleSlider';
import { usePosture } from '../context/PostureContext';
import { sensitivityToThresholdDeg } from '../storage/settings';

const ALERT_INTERVAL_OPTIONS: { label: string; value: number }[] = [
  { label: '30 сек', value: 30000 },
  { label: '1 мин', value: 60000 },
  { label: '2 мин', value: 120000 },
];

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function SettingsScreen() {
  const { settings, updateSettings, testBuzzer, connectionState } = usePosture();
  const [testing, setTesting] = useState(false);

  const thresholdDeg = sensitivityToThresholdDeg(settings.sensitivity);

  const handleTestBuzzer = async () => {
    setTesting(true);
    try {
      await testBuzzer();
      if (connectionState !== 'connected') {
        Alert.alert('Устройство не подключено', 'Подключите устройство или включите демо-режим на экране «Устройство».');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SectionTitle title="УВЕДОМЛЕНИЯ" />
      <Card style={styles.card}>
        <ToggleRow
          label="Вибрация"
          description="Вибросигнал при неправильной осанке"
          value={settings.vibrationEnabled}
          onValueChange={v => updateSettings({ vibrationEnabled: v })}
        />
        <ToggleRow
          label="Звук"
          description="Звуковой сигнал (BEEP) на устройстве"
          value={settings.soundEnabled}
          onValueChange={v => updateSettings({ soundEnabled: v })}
        />
        <ToggleRow
          label="Push-уведомления"
          value={settings.pushEnabled}
          onValueChange={v => updateSettings({ pushEnabled: v })}
          last
        />
      </Card>

      <SectionTitle title="МОНИТОРИНГ" />
      <Card style={styles.card}>
        <View style={styles.sliderHeader}>
          <Text style={typography.body}>Чувствительность</Text>
          <Text style={typography.caption}>{Math.round(thresholdDeg)}°</Text>
        </View>
        <SimpleSlider
          value={settings.sensitivity}
          onChange={v => updateSettings({ sensitivity: v })}
        />
        <Text style={[typography.caption, styles.sliderHint]}>
          Выше чувствительность — меньше порог отклонения до предупреждения
        </Text>

        <View style={styles.divider} />

        <Text style={[typography.body, styles.radioTitle]}>Интервал предупреждений</Text>
        <View style={styles.radioGroup}>
          {ALERT_INTERVAL_OPTIONS.map(opt => {
            const selected = settings.alertIntervalMs === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.radioRow}
                onPress={() => updateSettings({ alertIntervalMs: opt.value })}
              >
                <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                  {selected && <View style={styles.radioInner} />}
                </View>
                <Text style={typography.body}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.testRow} onPress={handleTestBuzzer} disabled={testing}>
          <Icon name="volume-high" size={18} color={colors.primary} />
          <Text style={[typography.bodyBold, styles.testLabel]}>Проверить зуммер</Text>
        </TouchableOpacity>
      </Card>

      <SectionTitle title="ДРУГОЕ" />
      <Card style={styles.card}>
        <View style={styles.staticRow}>
          <Text style={typography.body}>Единицы измерения</Text>
          <Text style={typography.caption}>Градусы</Text>
        </View>
        <View style={[styles.staticRow, styles.staticRowLast]}>
          <Text style={typography.body}>Тема</Text>
          <Text style={typography.caption}>Светлая</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  sectionTitle: {
    ...typography.captionBold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  card: { marginBottom: spacing.sm },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  sliderHint: { marginTop: spacing.xxs },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  radioTitle: { marginBottom: spacing.xs },
  radioGroup: { gap: spacing.xs },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xxs },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  radioOuterSelected: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  testRow: { flexDirection: 'row', alignItems: 'center' },
  testLabel: { color: colors.primary, marginLeft: spacing.sm },
  staticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  staticRowLast: { borderBottomWidth: 0 },
});
