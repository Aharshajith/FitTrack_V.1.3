import React, {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState } from 'react';
import { Appearance, StyleSheet, useColorScheme,} from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { darkColors, lightColors } from './colors';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'fittrack.appearance.v1';
const MODES = ['system', 'light', 'dark'];

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();

  const [mode, setMode] = useState('system');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const busy = useRef(false);

  useEffect(() => {
    let active = true;

    Storage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && MODES.includes(saved)) {
          setMode(saved);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            'Could not load your saved appearance. Select it again to retry.'
          );
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      Appearance.setColorScheme(
        mode === 'system' ? null : mode
      );
    }
  }, [mode, ready]);

  useEffect(() => {
    return () => Appearance.setColorScheme(null);
  }, []);

  const setThemeMode = useCallback(async (nextMode) => {
    if (
      !ready ||
      busy.current ||
      !MODES.includes(nextMode)
    ) {
      return;
    }

    busy.current = true;
    setSaving(true);
    setError('');

    try {
      await Storage.setItem(STORAGE_KEY, nextMode);
      setMode(nextMode);
    } catch {
      setError(
        'Appearance could not be saved. Please try again.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [ready]);

  const isDark = ( mode === 'system' ? systemScheme : mode ) === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const value = useMemo(() => ({
    colors,isDark,mode,ready,saving,error,setThemeMode
  }), 
    [colors,isDark,mode,ready,saving,error,setThemeMode,]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error(
      'useAppTheme must be used inside ThemeProvider.'
    );
  }

  return theme;
}

function createSharedStyles(colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },

    input: {
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 13,
      paddingHorizontal: 15,
      paddingVertical: 13,
      color: colors.text,
      fontSize: 15,
      minHeight: 49,
    },

    label: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 8,
      marginTop: 14,
    },

    muted: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 20,
    },

    title: {
      color: colors.text,
      fontWeight: '800',
      fontSize: 17,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    gap: {
      gap: 12,
    },
  });
}

export function useThemeStyles(factory) {
  const { colors } = useAppTheme();

  const shared = useMemo(
    () => createSharedStyles(colors),
    [colors]
  );

  const styles = useMemo(
    () => factory(colors, shared),
    [factory, colors, shared]
  );

  return { colors, shared, styles };
}