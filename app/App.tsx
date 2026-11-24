import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { rememberSignInEmail } from './src/services/rememberedAccount';
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
import ResetPassword from './src/screens/ResetPassword';

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
      <Tab.Screen
        name="More"
        component={More}
        options={{ tabBarLabel: 'More' }}
      />
    </Tab.Navigator>
  );
}

async function establishSessionFromAuthUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'wordalive-ministries:' || url.host !== 'auth' || url.pathname !== '/callback') return false;

  const fragment = new URLSearchParams(url.hash.slice(1));
  const param = (key: string) => fragment.get(key) ?? url.searchParams.get(key);
  if (param('error') || param('error_code')) throw new Error('Invalid email link');

  const code = param('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return param('type') === 'recovery';
  }

  const accessToken = param('access_token');
  const refreshToken = param('refresh_token');
  if (!accessToken || !refreshToken) throw new Error('Incomplete email link');

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
  return param('type') === 'recovery';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) {
        return;
      }

      if (nextSession?.user.email && ['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
        void rememberSignInEmail(nextSession.user.email);
      }

      if (event === 'PASSWORD_RECOVERY') {
        setSession(nextSession);
        setIsPasswordRecovery(Boolean(nextSession));
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsPasswordRecovery(false);
        setLoading(false);
        return;
      }

      if (nextSession) {
        setSession(nextSession);
      }

      setLoading(false);
    });

    async function handleAuthUrl(url: string) {
      try {
        const recovery = await establishSessionFromAuthUrl(url);
        if (isMounted && recovery) setIsPasswordRecovery(true);
      } catch {
        if (isMounted) Alert.alert('Unable to open email link', 'Request a fresh email and open the newest link on the phone with Word Alive Ministries installed.');
      }
    }

    void Linking.getInitialURL().then(url => { if (isMounted && url) void handleAuthUrl(url); });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => { void handleAuthUrl(url); });

    return () => {
      isMounted = false;
      linkSubscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  return (
    <AccessibilityProvider>
      <AppContent
        isPasswordRecovery={isPasswordRecovery}
        loading={loading}
        onCancelPasswordRecovery={async () => {
          await supabase.auth.signOut({ scope: 'local' });
          setIsPasswordRecovery(false);
        }}
        onCompletePasswordRecovery={() => setIsPasswordRecovery(false)}
        session={session}
      />
    </AccessibilityProvider>
  );
}

function AppContent({
  isPasswordRecovery,
  loading,
  onCancelPasswordRecovery,
  onCompletePasswordRecovery,
  session,
}: {
  isPasswordRecovery: boolean;
  loading: boolean;
  onCancelPasswordRecovery: () => Promise<void>;
  onCompletePasswordRecovery: () => void;
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

  if (isPasswordRecovery && session) {
    return (
      <ResetPassword
        onCancel={onCancelPasswordRecovery}
        onComplete={onCompletePasswordRecovery}
      />
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
