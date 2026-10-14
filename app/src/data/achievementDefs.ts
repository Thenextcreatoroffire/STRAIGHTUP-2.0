export interface AchievementDef {
  id: string;
  title: string;
  /** Shown under a locked badge as the unlock condition. */
  description: string;
  icon: string; // Ionicons name
}

export const achievementDefs: AchievementDef[] = [
  {
    id: 'no_alerts_session',
    title: 'Без предупреждений',
    description: 'Завершите сессию мониторинга без единого предупреждения',
    icon: 'shield-checkmark',
  },
  {
    id: 'streak_7',
    title: '7 дней подряд',
    description: 'Занимайтесь мониторингом осанки 7 дней подряд',
    icon: 'flame',
  },
  {
    id: 'hours_100',
    title: '100 часов',
    description: 'Наберите 100 часов суммарного использования устройства',
    icon: 'time',
  },
  {
    id: 'days_30',
    title: '30 дней использования',
    description: 'Используйте StraightUp в течение 30 разных дней',
    icon: 'calendar',
  },
];
