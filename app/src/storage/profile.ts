import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types/domain';
import { StorageKeys } from './keys';

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Пользователь',
  age: '',
  heightCm: '',
  goal: 'Держать спину прямо весь рабочий день',
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(StorageKeys.profile);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch (e) {
    console.warn('[storage/profile] failed to read profile', e);
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.profile, JSON.stringify(profile));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
