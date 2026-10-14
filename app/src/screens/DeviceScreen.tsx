import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { usePosture } from '../context/PostureContext';
import { bluetoothService, PairedDeviceInfo } from '../services/bluetooth';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { IconCircle } from '../components/IconCircle';
import { SegmentedControl } from '../components/SegmentedControl';
import { formatClock } from '../utils/dateUtils';

export default function DeviceScreen() {
  const posture = usePosture();
  const { connectionState, connectedDeviceName, connectedDeviceAddress, live, lastSyncAt, demoMode, setDemoMode, connectToDevice, disconnectDevice, isMonitoring } = posture;

  const [devices, setDevices] = useState<PairedDeviceInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(true);

  const loadDevices = useCallback(async () => {
    setScanning(true);
    try {
      setNativeAvailable(bluetoothService.isNativeModuleAvailable());
      const list = await bluetoothService.listPairedDevices();
      setDevices(list);
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!demoMode) {
      loadDevices();
    }
  }, [demoMode, loadDevices]);

  const handleConnect = async (device: PairedDeviceInfo) => {
    setConnectingAddress(device.address);
    try {
      const ok = await connectToDevice(device.address, device.name);
      if (!ok) {
        // eslint-disable-next-line no-console
        console.warn('Failed to connect to', device.address);
      }
    } finally {
      setConnectingAddress(null);
    }
  };

  const batteryLabel = live.batt == null || live.batt < 0 ? '—' : `${Math.round(live.batt)}%`;

  return (
    <View style={styles.screen}>
      <Card style={styles.statusCard}>
        <IconCircle
          name="bluetooth"
          size={56}
          color={connectionState === 'connected' ? colors.success : colors.primary}
        />
        <Text style={[typography.h3, styles.statusTitle]}>
          {connectionState === 'connected'
            ? 'Подключено'
            : connectionState === 'connecting'
            ? 'Поиск устройства...'
            : 'Не подключено'}
        </Text>
        {connectionState === 'connected' && (
          <>
            <Text style={typography.caption}>{connectedDeviceName ?? connectedDeviceAddress}</Text>
            <View style={styles.statusRow}>
              <Text style={typography.caption}>Батарея: {batteryLabel}</Text>
              <Text style={typography.caption}>
                {lastSyncAt ? `Синхронизация: ${formatClock(lastSyncAt)}` : 'Нет данных'}
              </Text>
            </View>
            <TouchableOpacity onPress={disconnectDevice} style={styles.disconnectBtn}>
              <Text style={styles.disconnectText}>Отключить</Text>
            </TouchableOpacity>
          </>
        )}
      </Card>

      <Card style={styles.demoCard}>
        <Text style={[typography.captionBold, { marginBottom: spacing.sm }]}>ИСТОЧНИК ДАННЫХ</Text>
        <SegmentedControl
          options={[
            { label: 'Демо-данные', value: 'demo' },
            { label: '3 датчика · HC-06', value: 'device' },
          ]}
          value={demoMode ? 'demo' : 'device'}
          onChange={value => { if (!isMonitoring) setDemoMode(value === 'demo'); }}
        />
        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
          {demoMode
            ? 'Симуляция трёх датчиков без подключения Arduino. Данные искусственные.'
            : 'Показания трёх MPU6050 через TCA9548A → Arduino Nano → HC-06.'}
        </Text>
        {isMonitoring && (
          <Text style={[typography.caption, { marginTop: spacing.xs, color: colors.warning }]}>
            Остановите мониторинг, прежде чем менять источник данных.
          </Text>
        )}
      </Card>

      {!demoMode && (
        <>
          {!nativeAvailable && (
            <Card style={styles.warningCard}>
              <Icon name="warning" size={18} color={colors.warning} />
              <Text style={[typography.caption, styles.warningText]}>
                Нативный модуль Bluetooth ещё не собран. Соберите приложение через `npx react-native
                run-android` в проекте с настроенной папкой android (см. README_APP.md), либо
                используйте демо-режим.
              </Text>
            </Card>
          )}
          <View style={styles.listHeader}>
            <Text style={typography.captionBold}>СОПРЯЖЁННЫЕ УСТРОЙСТВА</Text>
            <TouchableOpacity onPress={loadDevices}>
              <Icon name="refresh" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={devices}
            keyExtractor={item => item.address}
            refreshControl={<RefreshControl refreshing={scanning} onRefresh={loadDevices} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !scanning ? (
                <Text style={[typography.caption, styles.emptyText]}>
                  Сопряжённых устройств не найдено. Выполните сопряжение с HC-06 в настройках
                  Bluetooth Android, затем обновите список.
                </Text>
              ) : null
            }
            renderItem={({ item }) => {
              const isConnected = connectedDeviceAddress === item.address && connectionState === 'connected';
              const isConnecting = connectingAddress === item.address;
              return (
                <TouchableOpacity
                  style={styles.deviceRow}
                  onPress={() => handleConnect(item)}
                  disabled={isConnecting}
                >
                  <IconCircle name="hardware-chip" size={40} color={colors.primary} />
                  <View style={styles.deviceInfo}>
                    <Text style={typography.bodyBold}>{item.name}</Text>
                    <Text style={typography.caption}>{item.address}</Text>
                  </View>
                  {isConnecting ? (
                    <Text style={typography.caption}>Подключение...</Text>
                  ) : isConnected ? (
                    <Icon name="checkmark-circle" size={22} color={colors.success} />
                  ) : (
                    <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  statusCard: { alignItems: 'center', paddingVertical: spacing.lg, marginBottom: spacing.md },
  statusTitle: { marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxs },
  disconnectBtn: { marginTop: spacing.sm },
  disconnectText: { color: colors.danger, fontWeight: '600' },
  demoCard: { marginBottom: spacing.md },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    marginBottom: spacing.md,
  },
  warningText: { marginLeft: spacing.xs, flex: 1 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listContent: { paddingBottom: spacing.xl },
  emptyText: { textAlign: 'center', marginTop: spacing.xl },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  deviceInfo: { flex: 1, marginLeft: spacing.sm },
});
