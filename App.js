import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database/database';
import colors from './src/theme/colors';

const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, text: colors.text, primary: colors.primary, border: colors.border } };
export default function App() {
  const [state, setState] = useState({ ready: false, error: '' });
  useEffect(() => {
    initializeDatabase().then(() => setState({ ready: true, error: '' }))
      .catch((error) => { console.error(error); setState({ ready: false, error: error.message }); });
  }, []);
  if (!state.ready) return <View style={styles.loading}>
    {state.error ? <Text style={styles.error}>Database setup failed: {state.error}</Text> : <><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.text}>Preparing your offline workout space...</Text></>}
  </View>;
  return <SafeAreaProvider><NavigationContainer theme={theme}><StatusBar style="light" /><AppNavigator /></NavigationContainer></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 20 },
  text: { color: colors.muted, marginTop: 20 },
  error: { color: colors.danger, textAlign: 'center' },
});
