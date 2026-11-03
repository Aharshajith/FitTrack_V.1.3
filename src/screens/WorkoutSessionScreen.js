import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { SectionTitle, EmptyState, ActionButton, shared } from '../components/UI';
import { getDatabase } from '../database/database';
import colors from '../theme/colors';

export default function WorkoutSessionScreen({ navigation, route }) {
  const [plans, setPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [items, setItems] = useState([]);
  const [duration, setDuration] = useState('30');
  const [saving, setSaving] = useState(false);
  const [historyDetails, setHistoryDetails] = useState(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [savedPlans, sessions] = await Promise.all([
        db.getAllAsync('SELECT * FROM workout_plans ORDER BY id DESC'),
        db.getAllAsync(`SELECT s.id, s.date, s.duration, COALESCE(s.plan_name, p.name, 'Workout') AS plan_name, COUNT(r.id) AS exercise_count FROM workout_sessions s LEFT JOIN workout_plans p ON p.id = s.plan_id LEFT JOIN workout_records r ON s.id = r.session_id GROUP BY s.id ORDER BY s.id DESC LIMIT 12`),
      ]);
      setPlans(savedPlans); setHistory(sessions);
    } catch (error) { console.error('Sessions:', error); Alert.alert('Error', 'Unable to load workout data.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Tapping Start on a plan opens its recording form immediately.
  useEffect(() => {
    const startId = route.params?.startPlanId;
    if (!startId || !plans.length) return;
    navigation.setParams({ startPlanId: undefined });
    const plan = plans.find((item) => item.id === startId);
    if (plan) choosePlan(plan);
  }, [route.params?.startPlanId, plans, navigation]);

  async function choosePlan(plan) {
    try {
      const db = await getDatabase();
      const exercises = await db.getAllAsync(`SELECT e.id, e.name, p.sets, p.reps FROM plan_exercises p JOIN exercises e ON e.id = p.exercise_id WHERE p.plan_id = ? ORDER BY p.id`, plan.id);
      if (!exercises.length) return Alert.alert('No exercises', 'Edit this plan to add an exercise first.');
      setSelectedPlan(plan);
      setItems(exercises.map((exercise) => ({ ...exercise, sets: String(exercise.sets), reps: String(exercise.reps), weight: '0' })));
      setDuration('30');
    } catch (error) { console.error(error); Alert.alert('Error', 'Could not load exercises.'); }
  }
  function update(id, field, value) { setItems((all) => all.map((item) => item.id === id ? { ...item, [field]: value } : item)); }
  async function save() {
    if (busy.current || !selectedPlan) return;
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) return Alert.alert('Invalid duration', 'Enter whole minutes from 1 to 1440.');
    if (items.some((item) => !Number.isInteger(Number(item.sets)) || Number(item.sets) < 1 || Number(item.sets) > 100 || !Number.isInteger(Number(item.reps)) || Number(item.reps) < 1 || Number(item.reps) > 1000 || !Number.isFinite(Number(item.weight)) || Number(item.weight) < 0 || Number(item.weight) > 1000 || item.weight.trim() === '')) {
      return Alert.alert('Check your values', 'Each exercise needs valid sets, reps and a non-negative weight.');
    }
    busy.current = true; setSaving(true);
    try {
      const db = await getDatabase();
      await db.withExclusiveTransactionAsync(async (txn) => {
        const result = await txn.runAsync('INSERT INTO workout_sessions (plan_id, duration, plan_name) VALUES (?, ?, ?)', selectedPlan.id, minutes, selectedPlan.name);
        for (const exercise of items) {
          await txn.runAsync('INSERT INTO workout_records (session_id, exercise_id, sets, reps, weight) VALUES (?, ?, ?, ?, ?)', result.lastInsertRowId, exercise.id, Number(exercise.sets), Number(exercise.reps), Number(exercise.weight));
        }
      });
      setSelectedPlan(null); setItems([]); setDuration('30'); await load();
      Alert.alert('Workout saved!', 'Great work. Your progress has been recorded offline.');
    } catch (error) { console.error(error); Alert.alert('Error', 'Workout was not saved. Please try again.'); }
    finally { busy.current = false; setSaving(false); }
  }
  async function openDetails(session) {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync(`SELECT e.name, r.sets, r.reps, r.weight FROM workout_records r JOIN exercises e ON e.id = r.exercise_id WHERE r.session_id = ? ORDER BY r.id`, session.id);
      setHistoryDetails({ ...session, exercises: rows });
    } catch (error) { console.error(error); Alert.alert('Error', 'Unable to load workout details.'); }
  }

  return <ScreenLayout title="Workout log" subtitle="Train, record and celebrate the effort." scrollTopKey={selectedPlan?.id ?? 'choose'}>
    {!selectedPlan ? <>
      <SectionTitle>Choose a plan</SectionTitle>
      {!plans.length ? <EmptyState icon="barbell-outline" title="No workout plans yet" text="Open Plans and create one before recording your first session." /> : plans.map((plan) => <Pressable key={plan.id} accessibilityRole="button" style={styles.selectCard} onPress={() => choosePlan(plan)}>
        <View style={styles.planIcon}><Ionicons name="play" size={20} color={colors.primary}/></View>
        <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{plan.name}</Text><Text numberOfLines={2} style={styles.muted}>{plan.description || 'Tap to record this workout'}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted}/>
      </Pressable>)}
    </> : <View style={styles.form}>
      <View style={styles.topRow}><View style={{ flex: 1 }}><Text style={styles.formTag}>ACTIVE WORKOUT</Text><Text style={styles.formTitle}>{selectedPlan.name}</Text></View><Ionicons name="timer-outline" color={colors.primary} size={31}/></View>
      <Text style={shared.label}>DURATION IN MINUTES</Text>
      <TextInput accessibilityLabel="Workout duration in minutes" style={shared.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
      <SectionTitle>Exercise records</SectionTitle>
      {items.map((item) => <View key={item.id} style={styles.exercise}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.inputRow}>
          {[{ field: 'sets', title: 'SETS' }, { field: 'reps', title: 'REPS' }, { field: 'weight', title: 'KG' }].map(({ field, title }) => <View key={field} style={{ flex: 1 }}>
            <Text style={shared.label}>{title}</Text><TextInput accessibilityLabel={`${item.name} ${title}`} style={shared.input} keyboardType={field === 'weight' ? 'decimal-pad' : 'number-pad'} value={item[field]} onChangeText={(value) => update(item.id, field, value)}/>
          </View>)}
        </View>
      </View>)}
      <ActionButton icon="checkmark-circle-outline" title="Finish & save workout" loading={saving} onPress={save} style={{ marginTop: 17 }}/>
      <ActionButton secondary title="Cancel workout" onPress={() => Alert.alert('Discard workout?', 'Any unsaved changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => { setSelectedPlan(null); setItems([]); } },
      ])} style={{ marginTop: 9 }}/>
    </View>}

    <SectionTitle>Recent sessions</SectionTitle>
    {!history.length ? <EmptyState icon="calendar-outline" title="No saved workouts" text="Your completed sessions will appear here." /> : history.map((session) => <Pressable accessibilityRole="button" key={session.id} onPress={() => openDetails(session)} style={styles.history}>
      <View style={styles.historyIcon}><Ionicons name="checkmark" color={colors.primary} size={20}/></View>
      <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{session.plan_name}</Text><Text style={styles.muted}>{session.date.slice(0, 16)} · {session.exercise_count} exercises</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text style={styles.minutes}>{session.duration} min</Text><Ionicons name="chevron-forward" size={17} color={colors.muted}/></View>
    </Pressable>)}

    <Modal visible={!!historyDetails} animationType="slide" transparent onRequestClose={() => setHistoryDetails(null)}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        {historyDetails && <ScrollView>
          <View style={styles.topRow}><Text style={styles.formTitle}>{historyDetails.plan_name}</Text><Pressable onPress={() => setHistoryDetails(null)} accessibilityLabel="Close session details"><Ionicons name="close-circle-outline" color={colors.muted} size={28}/></Pressable></View>
          <Text style={[styles.muted, { marginVertical: 14 }]}>{historyDetails.date} · {historyDetails.duration} minutes</Text>
          {historyDetails.exercises.map((exercise, index) => <View key={index} style={styles.recordRow}>
            <Text style={styles.cardTitle}>{exercise.name}</Text><Text style={styles.muted}>{exercise.sets} sets × {exercise.reps} reps · {exercise.weight} kg</Text>
          </View>)}
          <ActionButton title="Close" onPress={() => setHistoryDetails(null)} style={{ marginTop: 18 }}/>
        </ScrollView>}
      </View></View>
    </Modal>
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  selectCard: { ...shared.card, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  planIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  form: { ...shared.card, marginBottom: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTag: { color: colors.primary, fontSize: 11, letterSpacing: 1.2, fontWeight: '800' },
  formTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  exercise: { backgroundColor: colors.elevated, borderRadius: 13, padding: 13, marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 9 },
  history: { ...shared.card, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9 },
  historyIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
  minutes: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' },
  sheet: { maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 23, borderTopRightRadius: 23, padding: 22, paddingBottom: 36 },
  recordRow: { backgroundColor: colors.elevated, padding: 13, borderRadius: 12, marginBottom: 8 },
});
