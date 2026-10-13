import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { PostureProvider } from './src/context/PostureContext';
import { seedDemoHistoryIfNeeded } from './src/storage/seedDemoData';
import { colors } from './src/theme';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    primary: colors.primary,
    text: colors.textPrimary,
    border: colors.border,
  },
};

export default function App() {
  useEffect(() => {
    seedDemoHistoryIfNeeded();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <PostureProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </PostureProvider>
    </SafeAreaProvider>
  );
}
