import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../types/domain';
import { StorageKeys } from './keys';

export const DEFAULT_SETTINGS: AppSettings = {
  vibrationEnabled: true,
  soundEnabled: true,
  pushEnabled: true,
  sensitivity: 0.5, // slider 0..1 -> SET_THRESH 20..5 deg
  alertIntervalMs: 60000, // 1 min
  demoMode: true, // ships in demo mode until real hardware is connected
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.settings);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.warn('[storage/settings] failed to read settings', e);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.settings, JSON.stringify(settings));
}

/** slider 0..1 -> degrees 20..5 (higher sensitivity = lower threshold). */
export function sensitivityToThresholdDeg(sensitivity: number): number {
  const clamped = Math.max(0, Math.min(1, sensitivity));
  return 20 - clamped * 15;
}

export function thresholdDegToSensitivity(deg: number): number {
  const clamped = Math.max(5, Math.min(20, deg));
  return (20 - clamped) / 15;
}
