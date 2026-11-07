import React from 'react';
import { StyleSheet } from 'react-native';
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

const TAB_CONFIG = {
  Home: {
    label: 'Home',
    accessibilityLabel: 'Home dashboard',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  Plans: {
    label: 'Plans',
    accessibilityLabel: 'Workout plans',
    activeIcon: 'barbell',
    inactiveIcon: 'barbell-outline',
  },
  Explore: {
    label: 'Explore',
    accessibilityLabel: 'Exercise library',
    activeIcon: 'compass',
    inactiveIcon: 'compass-outline',
  },
  Log: {
    label: 'Log',
    accessibilityLabel: 'Record a workout',
    activeIcon: 'add-circle',
    inactiveIcon: 'add-circle-outline',
  },
  Progress: {
    label: 'Progress',
    accessibilityLabel: 'Workout and body weight progress',
    activeIcon: 'stats-chart',
    inactiveIcon: 'stats-chart-outline',
  },
  Me: {
    label: 'Me',
    accessibilityLabel: 'My profile',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
};

const FALLBACK_TAB = {
  label: 'More',
  accessibilityLabel: 'Navigation tab',
  activeIcon: 'ellipse',
  inactiveIcon: 'ellipse-outline',
};

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => {
        const config = TAB_CONFIG[route.name] ?? FALLBACK_TAB;

        return {
          headerShown: false,
          lazy: true,

          tabBarHideOnKeyboard: true,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',

          tabBarLabel: config.label,
          tabBarAccessibilityLabel: config.accessibilityLabel,

          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,

          tabBarStyle: [
            styles.tabBar,
            {
              height: 60 + bottomPadding,
              paddingBottom: bottomPadding,
            },
          ],

          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,

          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={
                focused
                  ? config.activeIcon
                  : config.inactiveIcon
              }
              size={route.name === 'Log' ? 28 : 22}
              color={color}
              accessible={false}
            />
          ),
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
      />

      <Tab.Screen
        name="Plans"
        component={WorkoutPlansScreen}
      />

      <Tab.Screen
        name="Explore"
        component={ExerciseLibraryScreen}
      />

      <Tab.Screen
        name="Log"
        component={WorkoutSessionScreen}
      />

      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
      />

      <Tab.Screen
        name="Me"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },

  tabItem: {
    paddingHorizontal: 0,
  },

  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});