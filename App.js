import React, { useEffect,useMemo,useState } from 'react';
import { View,Text,ActivityIndicator,Pressable } from 'react-native';
import { NavigationContainer,DarkTheme,DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database/database';
import { ThemeProvider,useAppTheme } from './src/theme/ThemeProvider';

function AppContent() {
  const { colors, isDark, ready } = useAppTheme();
  const [state, setState] = useState({ ready: false,error: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ ready: false, error: '' });
    initializeDatabase()
      .then(() => {
        if (active) { 
          setState({ ready: true, error: '' }); 
        }
      })
      .catch((error) => {
        console.error(error);

        if (active) {
          setState({ ready: false, error: 'Database setup failed. Please retry.'});
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.danger,
      },
    };
  }, [colors, isDark]);

  return (
    <View
      style={{ flex: 1,backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {!ready || !state.ready ? (
        <View
          style={{ flex: 1,justifyContent: 'center',alignItems: 'center',padding: 24 }}>
          {state.error ? (
            <>
              <Text style={{ color: colors.danger,textAlign: 'center' }}>
                {state.error}
              </Text>

              <Pressable
                accessibilityRole="button"
                onPress={() => setAttempt((n) => n + 1)}
                style={{ padding: 16,marginTop: 12 }}
              >
                <Text style={{ color: colors.primary,fontWeight: '700' }}>
                  Retry
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary}/>
              <Text style={{color: colors.muted,marginTop: 20 }}>
                Preparing your offline workout space...
              </Text>
            </>
          )}
        </View>
      ) : (
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}