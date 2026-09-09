import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import DailyReadingScreen from './screens/DailyReadingScreen';
import BibleCalendarScreen from './screens/BibleCalendarScreen';
import StudyScreen from './screens/StudyScreen';
import ProfileScreen from './screens/ProfileScreen';
import {AccessibilityProvider} from './theme/AccessibilityContext'

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
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Calendar" component={BibleCalendarScreen} />
        <Tab.Screen name="Bible" component={DailyReadingScreen} />
        <Tab.Screen name="Study" component={StudyScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />

      </Tab.Navigator>
    </NavigationContainer>
    </AccessibilityProvider>
  );
}