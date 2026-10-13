import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { ProfileStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { PrimaryButton } from '../components/PrimaryButton';
import { usePosture } from '../context/PostureContext';
import { initials } from '../storage/profile';
import { getAllTimeSummary, getTrailingDayAggregates } from '../storage/sessions';
import { formatHoursMinutes } from '../utils/dateUtils';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

const GOOD_DAY_THRESHOLD = 70; // % correctness considered "a good day"
const PROGRESS_WINDOW_DAYS = 30;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, updateProfile } = usePosture();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  const [summary, setSummary] = useState({ usageMs: 0, correctnessPct: 0, alertCount: 0, sessionCount: 0, distinctDayCount: 0 });
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    const [allTime, trailing] = await Promise.all([
      getAllTimeSummary(),
      getTrailingDayAggregates(PROGRESS_WINDOW_DAYS),
    ]);
    setSummary(allTime);
    const goodDays = trailing.filter(d => d.sessionCount > 0 && d.correctnessPct >= GOOD_DAY_THRESHOLD).length;
    setProgress(goodDays / PROGRESS_WINDOW_DAYS);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      setDraft(profile);
    }, [profile]),
  );

  const handleSave = async () => {
    await updateProfile(draft);
    setEditing(false);
  };

  const avatarInitials = useMemo(() => initials(profile.name), [profile.name]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitials}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
            <Icon name="settings-outline" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={typography.h3}>Профиль</Text>
            <TouchableOpacity onPress={() => (editing ? handleSave() : setEditing(true))}>
              <Text style={styles.editLink}>{editing ? 'Сохранить' : 'Изменить'}</Text>
            </TouchableOpacity>
          </View>

          <ProfileField
            label="Имя"
            value={draft.name}
            editing={editing}
            onChangeText={v => setDraft(d => ({ ...d, name: v }))}
          />
          <ProfileField
            label="Возраст"
            value={draft.age}
            editing={editing}
            keyboardType="number-pad"
            onChangeText={v => setDraft(d => ({ ...d, age: v }))}
          />
          <ProfileField
            label="Рост, см"
            value={draft.heightCm}
            editing={editing}
            keyboardType="number-pad"
            onChangeText={v => setDraft(d => ({ ...d, heightCm: v }))}
          />
          <ProfileField
            label="Цель"
            value={draft.goal}
            editing={editing}
            onChangeText={v => setDraft(d => ({ ...d, goal: v }))}
            last
          />
        </Card>

        <Card style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={typography.h3}>Общий прогресс</Text>
            <Text style={typography.captionBold}>{Math.round(progress * 100)}%</Text>
          </View>
          <Text style={[typography.caption, styles.progressCaption]}>
            Доля дней за последние {PROGRESS_WINDOW_DAYS} с осанкой выше {GOOD_DAY_THRESHOLD}%
          </Text>
          <ProgressBar progress={progress} />
        </Card>

        <Card style={styles.summaryCard}>
          <SummaryStat label="Общее время" value={formatHoursMinutes(summary.usageMs)} />
          <SummaryStat
            label="Средняя осанка"
            value={`${Math.round(summary.correctnessPct)}%`}
            valueColor={summary.correctnessPct >= 70 ? colors.success : colors.danger}
          />
          <SummaryStat label="Предупреждения" value={`${summary.alertCount}`} last />
        </Card>

        <PrimaryButton
          label="Достижения"
          variant="outline"
          onPress={() => navigation.navigate('Achievements')}
          icon={<Icon name="trophy-outline" size={16} color={colors.primary} />}
          style={styles.achievementsBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileField({
  label,
  value,
  editing,
  onChangeText,
  keyboardType,
  last,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChangeText: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  last?: boolean;
}) {
  return (
    <View style={[fieldStyles.row, !last && fieldStyles.divider]}>
      <Text style={typography.caption}>{label}</Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={fieldStyles.input}
          keyboardType={keyboardType}
          placeholder={label}
          placeholderTextColor={colors.textMuted}
        />
      ) : (
        <Text style={typography.bodyBold}>{value || '—'}</Text>
      )}
    </View>
  );
}

function SummaryStat({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[summaryStyles.row, !last && summaryStyles.divider]}>
      <Text style={typography.body}>{label}</Text>
      <Text style={[typography.bodyBold, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 26, fontWeight: '700' },
  settingsBtn: { padding: spacing.xs },
  infoCard: { marginBottom: spacing.md },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  editLink: { color: colors.primary, fontWeight: '600' },
  progressCard: { marginBottom: spacing.md },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressCaption: { marginTop: 2, marginBottom: spacing.sm },
  summaryCard: { marginBottom: spacing.md },
  achievementsBtn: { marginBottom: spacing.xl },
});

const fieldStyles = StyleSheet.create({
  row: { paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  input: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
  },
});

const summaryStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
