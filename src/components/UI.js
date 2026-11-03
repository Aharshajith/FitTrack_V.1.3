import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export function SectionTitle({ children, action, onAction }) {
  return <View style={styles.section}>
    <Text style={styles.sectionText}>{children}</Text>
    {action && <Pressable onPress={onAction} accessibilityRole="button"><Text style={styles.sectionAction}>{action}</Text></Pressable>}
  </View>;
}

export function ActionButton({ title, icon, onPress, secondary = false, danger = false, disabled = false, loading = false, style }) {
  return <Pressable
    accessibilityRole="button"
    disabled={disabled || loading}
    onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, (pressed || disabled) && styles.pressed, style]}
  >
    {loading ? <ActivityIndicator color={secondary ? colors.primary : colors.primaryDark} /> : <>
      {icon && <Ionicons name={icon} size={19} color={secondary || danger ? (danger ? colors.danger : colors.primary) : colors.primaryDark} />}
      <Text style={[styles.buttonText, secondary && styles.secondaryText, danger && styles.dangerText]}>{title}</Text>
    </>}
  </Pressable>;
}

export function StatTile({ label, value, icon, accent = colors.primary }) {
  return <View style={styles.statTile}>
    <View style={[styles.statIcon, { backgroundColor: colors.elevated }]}><Ionicons name={icon} color={accent} size={19} /></View>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>;
}

export function EmptyState({ icon = 'leaf-outline', title, text }) {
  return <View style={styles.empty}>
    <Ionicons name={icon} size={34} color={colors.primary} />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{text}</Text>
  </View>;
}

export function Pill({ title, active, onPress }) {
  return <Pressable
    accessibilityRole="button" accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[styles.pill, active && styles.pillActive]}
  ><Text style={[styles.pillText, active && styles.pillTextActive]}>{title}</Text></Pressable>;
}

export const shared = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border },
  input: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, color: colors.text, fontSize: 15, minHeight: 49 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  title: { color: colors.text, fontWeight: '800', fontSize: 17 },
  row: { flexDirection: 'row', alignItems: 'center' },
  gap: { gap: 12 },
});

const styles = StyleSheet.create({
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 14 },
  sectionText: { color: colors.text, fontSize: 19, fontWeight: '800' },
  sectionAction: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  button: { borderRadius: 14, backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, minHeight: 50 },
  buttonText: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  secondary: { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1 },
  secondaryText: { color: colors.primary },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger, borderWidth: 1 },
  dangerText: { color: colors.danger },
  pressed: { opacity: 0.65 },
  statTile: { width: '48%', flexGrow: 1, padding: 17, borderRadius: 17, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  statIcon: { height: 34, width: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statValue: { fontSize: 25, fontWeight: '900', color: colors.text },
  statLabel: { color: colors.muted, fontSize: 12, marginTop: 7 },
  empty: { alignItems: 'center', borderColor: colors.border, borderWidth: 1, borderStyle: 'dashed', borderRadius: 18, padding: 25, backgroundColor: colors.surface },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 10 },
  emptyMessage: { color: colors.muted, fontSize: 13, marginTop: 7, textAlign: 'center', lineHeight: 20 },
  pill: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  pillTextActive: { color: colors.primaryDark },
});
