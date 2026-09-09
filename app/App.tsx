import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Home from './src/screens/Home';
import Bible from './src/screens/Bible';
import Calendar from './src/screens/Calendar';
import Study from './src/screens/Study';
import Profile from './src/screens/Profile';
import {AccessibilityProvider} from './src/theme/AccessibilityContext'

const Tab = createBottomTabNavigator();
export default function App() {
  return (
<AccessibilityProvider>
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={ ({ route }) =>({
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
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#fedd21d8', // Ministry Gold
          tabBarInactiveTintColor: '#Fdfcf0', // Cream
          tabBarStyle: {
            backgroundColor: '#044b04af', // Ministry Green
            paddingBottom: 5,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#044b04af',
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
    </NavigationContainer>
    </AccessibilityProvider>
  );
}