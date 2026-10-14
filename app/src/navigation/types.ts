import { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Home: undefined;
  Device: undefined;
};

export type StatisticsStackParamList = {
  Statistics: undefined;
};

export type HistoryStackParamList = {
  History: undefined;
  DayDetail: { date: string };
};

export type RecommendationsStackParamList = {
  Recommendations: undefined;
  ExerciseDetail: { exerciseId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  Achievements: undefined;
  Settings: undefined;
  Device: undefined;
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  StatisticsTab: NavigatorScreenParams<StatisticsStackParamList>;
  HistoryTab: NavigatorScreenParams<HistoryStackParamList>;
  RecommendationsTab: NavigatorScreenParams<RecommendationsStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};
