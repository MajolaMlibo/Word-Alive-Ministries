import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';

import { supabase } from './src/services/supabase';
import { AccessibilityProvider } from './src/theme/AccessibilityContext';

import Home from './src/screens/Home';
import Bible from './src/screens/Bible';
import Calendar from './src/screens/Calendar';
import Study from './src/screens/Study';
import Profile from './src/screens/Profile';
import SignIn from './src/screens/SignIn';

import * as Linking from "expo-linking";

const DEV_BYPASS_AUTH = true;
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'calendar-outline';

          if (route.name === 'Home')
            iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Calendar')
            iconName = focused ? 'calendar' : 'calendar-outline';
          else if (route.name === 'Bible')
            iconName = focused ? 'book' : 'book-outline';
          else if (route.name === 'Study')
            iconName = focused ? 'school' : 'school-outline';
          else if (route.name === 'Profile')
            iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#fedd21',
        tabBarInactiveTintColor: '#Fdfcf0',
        tabBarStyle: {
          backgroundColor: '#044b04',
          height: 60,
          paddingBottom: 5,
        },
        headerStyle: {
          backgroundColor: '#044b04',
        },
        headerTintColor: '#Fdfcf0',
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Calendar" component={Calendar} />
      <Tab.Screen name="Bible" component={Bible} />
      <Tab.Screen name="Study" component={Study} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

  const sub = Linking.addEventListener("url", async ({ url }) => {
    await supabase.auth.exchangeCodeForSession(url);
  });

  return () => sub.remove();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
  <AccessibilityProvider>
    <NavigationContainer>
      {DEV_BYPASS_AUTH ? (
        <MainTabs />
      ) : session ? (
        <MainTabs />
      ) : (
        <SignIn />
      )}
    </NavigationContainer>
  </AccessibilityProvider>
);
}