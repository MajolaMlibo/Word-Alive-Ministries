import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {AccessibilityProvider}  from './src/theme/AccessibilityContext';
import TabNavigator  from './src/navigation/TabNavigator';

export default function App(){

return (
 <AccessibilityProvider>
   <NavigationContainer>
      <TabNavigator/>
   </NavigationContainer>
 </AccessibilityProvider>
)}