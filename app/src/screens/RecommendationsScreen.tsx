import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecommendationsStackParamList } from '../navigation/types';
import { colors, spacing, typography } from '../theme';
import { Card } from '../components/Card';
import { IconCircle } from '../components/IconCircle';
import { PrimaryButton } from '../components/PrimaryButton';
import { exercises } from '../data/exercises';
import { usePosture } from '../context/PostureContext';

type Nav = NativeStackNavigationProp<RecommendationsStackParamList, 'Recommendations'>;

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function RecommendationsScreen() {
  const navigation = useNavigation<Nav>();
  const { isMonitoring, sessionElapsedMs } = usePosture();

  const showWalkBreak = isMonitoring && sessionElapsedMs > ONE_HOUR_MS;

  const visibleExercises = useMemo(
    () => exercises.filter(e => !e.contextual || showWalkBreak),
    [showWalkBreak],
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[typography.caption, styles.intro]}>
        Короткие упражнения помогают снять напряжение и удерживать правильную осанку в течение дня.
      </Text>

      {visibleExercises.map(exercise => (
        <Card
          key={exercise.id}
          style={[styles.card, exercise.contextual ? styles.contextualCard : null]}
        >
          <View style={styles.cardHeader}>
            <IconCircle
              name={exercise.icon}
              color={exercise.contextual ? colors.danger : colors.primary}
            />
            <View style={styles.cardHeaderText}>
              <Text style={typography.h3}>{exercise.title}</Text>
              <Text style={typography.caption}>{exercise.durationMin} минут</Text>
            </View>
          </View>
          <Text style={[typography.body, styles.description]}>{exercise.description}</Text>
          <PrimaryButton
            label={exercise.contextual ? 'Начать' : 'Смотреть'}
            variant={exercise.contextual ? 'danger' : 'primary'}
            small
            style={styles.cardButton}
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: exercise.id })}
          />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl },
  intro: { marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  contextualCard: { backgroundColor: colors.dangerLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderText: { marginLeft: spacing.sm, flex: 1 },
  description: { marginTop: spacing.sm },
  cardButton: { marginTop: spacing.md, alignSelf: 'flex-start' },
});
