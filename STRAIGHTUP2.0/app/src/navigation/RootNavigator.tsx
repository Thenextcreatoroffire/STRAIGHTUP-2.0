import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import DeviceScreen from '../screens/DeviceScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DayDetailScreen from '../screens/DayDetailScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsScreen from '../screens/SettingsScreen';

import {
  HistoryStackParamList,
  HomeStackParamList,
  ProfileStackParamList,
  RecommendationsStackParamList,
  RootTabParamList,
  StatisticsStackParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const StatisticsStack = createNativeStackNavigator<StatisticsStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const RecommendationsStack = createNativeStackNavigator<RecommendationsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const screenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.textPrimary, fontWeight: '700' },
  contentStyle: { backgroundColor: colors.background },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: 'StraightUp' }} />
      <HomeStack.Screen name="Device" component={DeviceScreen} options={{ title: 'Устройство' }} />
    </HomeStack.Navigator>
  );
}

function StatisticsStackNavigator() {
  return (
    <StatisticsStack.Navigator screenOptions={screenOptions}>
      <StatisticsStack.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{ title: 'Статистика' }}
      />
    </StatisticsStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen name="History" component={HistoryScreen} options={{ title: 'История' }} />
      <HistoryStack.Screen
        name="DayDetail"
        component={DayDetailScreen}
        options={{ title: 'Детальная статистика' }}
      />
    </HistoryStack.Navigator>
  );
}

function RecommendationsStackNavigator() {
  return (
    <RecommendationsStack.Navigator screenOptions={screenOptions}>
      <RecommendationsStack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{ title: 'Рекомендации' }}
      />
      <RecommendationsStack.Screen
        name="ExerciseDetail"
        component={ExerciseDetailScreen}
        options={{ title: 'Упражнение' }}
      />
    </RecommendationsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Профиль' }} />
      <ProfileStack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: 'Достижения' }}
      />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Настройки' }} />
      <ProfileStack.Screen name="Device" component={DeviceScreen} options={{ title: 'Устройство' }} />
    </ProfileStack.Navigator>
  );
}

const TAB_ICONS: Record<keyof RootTabParamList, string> = {
  HomeTab: 'home',
  StatisticsTab: 'bar-chart',
  HistoryTab: 'time',
  RecommendationsTab: 'heart',
  ProfileTab: 'person',
};

const TAB_LABELS: Record<keyof RootTabParamList, string> = {
  HomeTab: 'Главная',
  StatisticsTab: 'Статистика',
  HistoryTab: 'История',
  RecommendationsTab: 'Рекомендации',
  ProfileTab: 'Профиль',
};

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Icon name={TAB_ICONS[route.name as keyof RootTabParamList]} size={size * 0.9} color={color} />
        ),
        tabBarLabel: TAB_LABELS[route.name as keyof RootTabParamList],
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="StatisticsTab" component={StatisticsStackNavigator} />
      <Tab.Screen name="HistoryTab" component={HistoryStackNavigator} />
      <Tab.Screen name="RecommendationsTab" component={RecommendationsStackNavigator} />
      <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
}
