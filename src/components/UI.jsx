import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../theme/ThemeProvider';

export function SectionTitle({ children, action, onAction }) {
  const { styles } = useThemeStyles(createStyles);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionText}>
        {children}
      </Text>

      {!!action && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
        >
          <Text style={styles.sectionAction}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function ActionButton({
  title,
  icon,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  loading = false,
  style,
}) {
  const { colors, styles } = useThemeStyles(createStyles);

  const unavailable = disabled || loading;

  const foreground = danger
    ? colors.danger
    : secondary
      ? colors.primary
      : colors.primaryDark;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: unavailable,
        busy: loading,
      }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && styles.danger,
        (pressed || unavailable) && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {!!icon && (
            <Ionicons
              name={icon}
              size={19}
              color={foreground}
            />
          )}

          <Text
            style={[
              styles.buttonText,
              { color: foreground },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function StatTile({ label, value, icon, accent }) {
  const { colors, styles } = useThemeStyles(createStyles);

  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          color={accent ?? colors.primary}
          size={19}
        />
      </View>

      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon = 'leaf-outline',
  title,
  text,
}) {
  const { colors, styles } = useThemeStyles(createStyles);

  return (
    <View style={styles.empty}>
      <Ionicons
        name={icon}
        size={34}
        color={colors.primary}
      />

      <Text style={styles.emptyTitle}>
        {title}
      </Text>

      <Text style={styles.emptyMessage}>
        {text}
      </Text>
    </View>
  );
}

export function Pill({ title, active, onPress }) {
  const { styles } = useThemeStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          active && styles.pillTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 14,
  },

  sectionText: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },

  sectionAction: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  button: {
    borderRadius: 14,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 50,
  },

  buttonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },

  secondary: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
  },

  danger: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
  },

  pressed: {
    opacity: 0.65,
  },

  statTile: {
    width: '48%',
    flexGrow: 1,
    padding: 17,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },

  statIcon: {
    height: 34,
    width: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: colors.elevated,
  },

  statValue: {
    fontSize: 25,
    fontWeight: '900',
    color: colors.text,
  },

  statLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
  },

  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    padding: 25,
    backgroundColor: colors.surface,
  },

  emptyTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyMessage: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
    lineHeight: 20,
  },
  pill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: colors.primaryDark,
  },
});