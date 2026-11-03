import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutPlansScreen from '../screens/WorkoutPlansScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import WorkoutSessionScreen from '../screens/WorkoutSessionScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import colors from '../theme/colors';

const Tab = createBottomTabNavigator();
const icons = {
  Home: ['home', 'home-outline'], Plans: ['barbell', 'barbell-outline'],
  Explore: ['compass', 'compass-outline'], Log: ['add-circle', 'add-circle-outline'],
  Progress: ['stats-chart', 'stats-chart-outline'], Me: ['person', 'person-outline'],
};

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  return <Tab.Navigator initialRouteName="Home" screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarHideOnKeyboard: true,
    tabBarStyle: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, height: 61 + insets.bottom, paddingTop: 8, paddingBottom: 8 + insets.bottom },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    tabBarIcon: ({ focused, color }) => <Ionicons name={icons[route.name][focused ? 0 : 1]} color={color} size={route.name === 'Log' ? 28 : 22} />,
  })}>
    <Tab.Screen name="Home" component={DashboardScreen} />
    <Tab.Screen name="Plans" component={WorkoutPlansScreen} />
    <Tab.Screen name="Explore" component={ExerciseLibraryScreen} />
    <Tab.Screen name="Log" component={WorkoutSessionScreen} />
    <Tab.Screen name="Progress" component={ProgressScreen} />
    <Tab.Screen name="Me" component={ProfileScreen} />
  </Tab.Navigator>;
}
