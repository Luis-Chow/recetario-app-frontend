import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { MainTabParamList } from '../types';

import RecipeListScreen from '../screens/recipes/RecipeListScreen';
import RecipeDetailScreen from '../screens/recipes/RecipeDetailScreen';
import RecipeFormScreen from '../screens/recipes/RecipeFormScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator();

const ACCENT = '#E8735A';
const GRAY = '#9CA3AF';

function AllRecipesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecipeList" component={RecipeListScreen} initialParams={{ personal: false }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
    </Stack.Navigator>
  );
}

function MyRecipesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecipeList" component={RecipeListScreen} initialParams={{ personal: true }} />
      <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
      <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: GRAY,
        tabBarStyle: { backgroundColor: '#1F2937', borderTopColor: '#374151', paddingBottom: 5, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ size }) => {
          const icons: Record<string, string> = {
            AllRecipes: '🌍',
            MyRecipes: '👨‍🍳',
            Profile: '👤',
          };
          return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
        },
      })}
    >
      <Tab.Screen name="AllRecipes" component={AllRecipesStack} options={{ tabBarLabel: 'Todas' }} />
      <Tab.Screen name="MyRecipes" component={MyRecipesStack} options={{ tabBarLabel: 'Mis Recetas' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}
