import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { SectionTitle, ActionButton, shared } from '../components/UI';
import { getDatabase } from '../database/database';
import colors from '../theme/colors';

const goals = ['Build Muscle', 'Lose Weight', 'Improve Fitness', 'Maintain Weight'];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('Improve Fitness');
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const profile = await db.getFirstAsync('SELECT * FROM user_profile ORDER BY id DESC LIMIT 1');
      if (profile) {
        setName(profile.name || ''); setEmail(profile.email || '');
        setAge(profile.age === null ? '' : String(profile.age));
        setHeight(profile.height === null ? '' : String(profile.height));
        setGoal(profile.fitness_goal || 'Improve Fitness');
      }
    } catch (error) { console.error('Profile:', error); Alert.alert('Error', 'Could not load your profile.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function save() {
    if (busy.current) return;
    const cleanName = name.trim(); const cleanEmail = email.trim();
    if (!cleanName) return Alert.alert('Name required', 'Enter your name before saving.');
    if (cleanName.length > 80) return Alert.alert('Name too long', 'Use 80 characters or fewer.');
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return Alert.alert('Invalid email', 'Enter a valid email address or leave it blank.');
    if (age.trim() && (!Number.isInteger(Number(age)) || Number(age) < 10 || Number(age) > 120)) return Alert.alert('Invalid age', 'Enter an age between 10 and 120.');
    if (height.trim() && (!Number.isFinite(Number(height)) || Number(height) < 50 || Number(height) > 270)) return Alert.alert('Invalid height', 'Enter a height between 50 and 270 cm.');
    busy.current = true; setSaving(true);
    try {
      const db = await getDatabase();
      const existing = await db.getFirstAsync('SELECT id FROM user_profile ORDER BY id DESC LIMIT 1');
      const values = [cleanName, cleanEmail, age.trim() ? Number(age) : null, height.trim() ? Number(height) : null, goal];
      if (existing) await db.runAsync('UPDATE user_profile SET name = ?, email = ?, age = ?, height = ?, fitness_goal = ? WHERE id = ?', ...values, existing.id);
      else await db.runAsync('INSERT INTO user_profile (name, email, age, height, fitness_goal) VALUES (?, ?, ?, ?, ?)', ...values);
      await load(); Alert.alert('Profile updated', 'Your details are saved on this device.');
    } catch (error) { console.error(error); Alert.alert('Error', 'Could not save your profile.'); }
    finally { busy.current = false; setSaving(false); }
  }

  const fields = [
    { title: 'YOUR NAME', value: name, set: setName, placeholder: 'Enter your name', keyboard: 'default', maxLength: 80 },
    { title: 'EMAIL ADDRESS (OPTIONAL)', value: email, set: setEmail, placeholder: 'name@example.com', keyboard: 'email-address', maxLength: 120 },
    { title: 'AGE (OPTIONAL)', value: age, set: setAge, placeholder: 'Your age', keyboard: 'number-pad', maxLength: 3 },
    { title: 'HEIGHT IN CM (OPTIONAL)', value: height, set: setHeight, placeholder: 'e.g. 165', keyboard: 'decimal-pad', maxLength: 6 },
  ];

  return <ScreenLayout title="My profile" subtitle="Make your fitness journey personal.">
    <View style={styles.header}>
      <View style={styles.avatar}><Text style={styles.initial}>{name.trim() ? name.trim()[0].toUpperCase() : 'F'}</Text></View>
      <View style={{ flex: 1 }}><Text style={styles.name}>{name.trim() || 'FitTrack member'}</Text><Text style={styles.email}>{email.trim() || 'Your personal fitness space'}</Text></View>
      <Ionicons name="shield-checkmark-outline" color={colors.primary} size={24}/>
    </View>

    <SectionTitle>Personal details</SectionTitle>
    <View style={styles.form}>
      {fields.map((field) => <View key={field.title}>
        <Text style={shared.label}>{field.title}</Text>
        <TextInput accessibilityLabel={field.title} style={shared.input} value={field.value} onChangeText={field.set} placeholder={field.placeholder} placeholderTextColor={colors.muted} keyboardType={field.keyboard} autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'sentences'} maxLength={field.maxLength}/>
      </View>)}
    </View>

    <SectionTitle>Fitness goal</SectionTitle>
    <View style={styles.goals}>{goals.map((item) => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: item === goal }} style={[styles.goal, goal === item && styles.goalActive]} onPress={() => setGoal(item)}>
      <Text style={[styles.goalText, goal === item && styles.goalTextActive]}>{item}</Text>
      <Ionicons name={goal === item ? 'radio-button-on' : 'radio-button-off'} color={goal === item ? colors.primary : colors.muted} size={21}/>
    </Pressable>)}</View>

    <ActionButton icon="save-outline" title="Save profile" loading={saving} onPress={save} style={{ marginTop: 22 }}/>
    <View style={styles.privacy}><Ionicons name="lock-closed-outline" size={16} color={colors.primary}/><Text style={styles.privacyText}>Your profile and workout records stay on your device. No internet required.</Text></View>
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  header: { ...shared.card, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { height: 58, width: 58, backgroundColor: colors.primary, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.primaryDark, fontSize: 28, fontWeight: '900' },
  name: { color: colors.text, fontSize: 17, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 12, marginTop: 5 },
  form: { ...shared.card, paddingTop: 5, paddingBottom: 19 },
  goals: { gap: 9 },
  goal: { ...shared.card, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalActive: { borderColor: colors.primary, backgroundColor: colors.elevated },
  goalText: { color: colors.muted, fontWeight: '700' },
  goalTextActive: { color: colors.text },
  privacy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 },
  privacyText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17 },
});
