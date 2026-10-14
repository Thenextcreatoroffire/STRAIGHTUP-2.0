import React, { useLayoutEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { RecommendationsStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { getExerciseById, getNextExercise } from '../data/exercises';

type Route = RouteProp<RecommendationsStackParamList, 'ExerciseDetail'>;
type Nav = NativeStackNavigationProp<RecommendationsStackParamList, 'ExerciseDetail'>;

export default function ExerciseDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const exercise = useMemo(
    () => getExerciseById(route.params.exerciseId) ?? getExerciseById('neck_warmup')!,
    [route.params.exerciseId],
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: exercise.title });
  }, [navigation, exercise.title]);

  const handleNext = () => {
    const next = getNextExercise(exercise.id);
    navigation.setParams({ exerciseId: next.id });
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.videoBox}>
        <View style={styles.playCircle}>
          <Icon name="play" size={28} color={colors.white} />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{exercise.durationMin} мин</Text>
        </View>
      </View>

      <Text style={[typography.h2, styles.title]}>{exercise.title}</Text>
      <Text style={[typography.body, styles.description]}>{exercise.description}</Text>

      <Card style={styles.stepsCard}>
        <Text style={typography.h3}>Шаги</Text>
        {exercise.steps.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={[typography.body, styles.stepText]}>{step}</Text>
          </View>
        ))}
      </Card>

      <PrimaryButton
        label="Следующее упражнение"
        variant="outline"
        onPress={handleNext}
        style={styles.nextButton}
        icon={<Icon name="arrow-forward" size={16} color={colors.primary} />}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  videoBox: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(28,28,40,0.55)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  durationText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  title: { marginBottom: spacing.xs },
  description: { marginBottom: spacing.md, color: colors.textMuted },
  stepsCard: { marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.sm },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  stepNumberText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  stepText: { flex: 1 },
  nextButton: { marginBottom: spacing.xl },
});
