import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  View,
} from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { supabase } from './src/services/supabase';
import {
  AccessibilityProvider,
  useAccessibility,
} from './src/theme/AccessibilityContext';
import { AppColors } from './src/theme/theme';

import Home from './src/screens/Home';
import Bible from './src/screens/Bible';
import Calendar from './src/screens/Calendar';
import Study from './src/screens/Study';
import More from './src/screens/More';
import SignIn from './src/screens/SignIn';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useAccessibility();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'calendar-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Calendar') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Bible') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Study') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'apps' : 'apps-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarStyle: {
          backgroundColor: colors.primary,
          height: 60,
          paddingBottom: 5,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#FFFFFF',
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Calendar" component={Calendar} />
      <Tab.Screen name="Bible" component={Bible} />
      <Tab.Screen name="Study" component={Study} />
      <Tab.Screen name="More" component={More} />
    </Tab.Navigator>
  );
}

function valueFromFragment(url: string, key: string) {
  const fragment = url.split('#')[1];
  if (!fragment) {
    return null;
  }

  return new URLSearchParams(fragment).get(key);
}

async function establishSessionFromAuthUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;

  if (typeof code === 'string') {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn('Unable to complete the email confirmation.', error.message);
    }
    return;
  }

  const accessToken = valueFromFragment(url, 'access_token');
  const refreshToken = valueFromFragment(url, 'refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.warn('Unable to restore the email-confirmed session.', error.message);
    }
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    return () => appStateSubscription.remove();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await establishSessionFromAuthUrl(initialUrl);
      }

      const {
        data: { session: restoredSession },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.warn('Unable to restore the saved session.', error.message);
      }

      if (isMounted) {
        setSession(restoredSession);
        setLoading(false);
      }
    }

    void restoreSession();

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void establishSessionFromAuthUrl(url);
    });

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      linkSubscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  return (
    <AccessibilityProvider>
      <AppContent loading={loading} session={session} />
    </AccessibilityProvider>
  );
}

function AppContent({
  loading,
  session,
}: {
  loading: boolean;
  session: Session | null;
}) {
  const { colors, colorScheme } = useAccessibility();
  const styles = makeStyles(colors);
  const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      border: colors.borderSoft,
      card: colors.primary,
      notification: colors.accent,
      primary: colors.primary,
      text: colors.text,
    },
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {session ? <MainTabs /> : <SignIn />}
    </NavigationContainer>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    loadingScreen: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      flex: 1,
      justifyContent: 'center',
    },
  });
}
