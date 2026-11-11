import React from 'react';
import { View,Text,Pressable,ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeProvider';

const options = [
  { value: 'light',label: 'Light',icon: 'sunny-outline' },
  { value: 'dark',label: 'Dark',icon: 'moon-outline' },
  { value: 'system',label: 'System',icon: 'phone-portrait-outline' },
];

export default function AppearanceSettings() {
  const { colors,mode,saving,error,setThemeMode } = useAppTheme();

  return (
    <View style={{ marginTop: 24, marginBottom: 8 }}>
      <Text style={{ color: colors.text,fontSize: 19,fontWeight: '800' }}>
        Appearance
      </Text>

      <Text style={{ color: colors.muted,marginTop: 6,marginBottom: 14,lineHeight: 20 }}>
        Choose a theme, or follow your phone’s settings.
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {options.map((option) => {
          const selected = mode === option.value;

          const foreground = selected
            ? colors.primaryDark
            : colors.text;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{selected,disabled: saving}}
              disabled={saving}
              onPress={() => setThemeMode(option.value)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 82,
                padding: 12,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: selected
                  ? colors.primary
                  : colors.surface,
                borderWidth: 1,
                borderColor: selected
                  ? colors.primary
                  : colors.border,
                opacity: pressed || saving ? 0.65 : 1,
              })}
            >
              <Ionicons name={option.icon} size={23} color={foreground}/>
              <Text style={{color: foreground,fontWeight: '700' }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {saving && (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }}/>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={{color: colors.danger,marginTop: 10 }}>
          {error}
        </Text>
      )}
    </View>
  );
}