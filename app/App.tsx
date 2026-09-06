import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';

// Temporary placeholder screens 
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
        screenOptions={ ({ route }) =>({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

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
        })}
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