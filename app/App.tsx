import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';

// Temporary placeholder screens for the other tabs so the app doesn't crash
const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#Fdfcf0' }}>
    <Text style={{ fontSize: 20, color: '#004d00', fontWeight: 'bold' }}>{name} Screen Coming Soon...</Text>
  </View>
);

const CalendarScreen = () => <PlaceholderScreen name="Calendar" />;
const BibleScreen = () => <PlaceholderScreen name="Bible" />;
const StudyScreen = () => <PlaceholderScreen name="Study" />;
const ProfileScreen = () => <PlaceholderScreen name="Profile" />;

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#e6c200', // Ministry Gold
          tabBarInactiveTintColor: '#Fdfcf0', // Cream
          tabBarStyle: {
            backgroundColor: '#004d00', // Ministry Green
            paddingBottom: 5,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#004d00',
          },
          headerTintColor: '#Fdfcf0',
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Bible" component={BibleScreen} />
        <Tab.Screen name="Study" component={StudyScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}