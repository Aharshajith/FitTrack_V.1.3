import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { ActionButton, EmptyState, SectionTitle, shared } from '../components/UI';
import { getDatabase } from '../database/database';
import colors from '../theme/colors';

export default function WorkoutPlansScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [library, setLibrary] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [saved, available] = await Promise.all([
        db.getAllAsync(`SELECT p.*, (SELECT COUNT(*) FROM plan_exercises WHERE plan_id = p.id) AS exercise_count FROM workout_plans p ORDER BY p.id DESC`),
        db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC'),
      ]);
      setPlans(saved); setLibrary(available);
    } catch (error) { console.error('Plans:', error); Alert.alert('Error', 'Unable to load workout plans.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function resetForm() {
    setEditingId(null); setName(''); setDescription(''); setSelected([]); setShowForm(false);
  }
  function startCreate() { resetForm(); setShowForm(true); }
  async function startEdit(plan) {
    try {
      const db = await getDatabase();
      const rows = await db.getAllAsync('SELECT exercise_id, sets, reps FROM plan_exercises WHERE plan_id = ? ORDER BY id', plan.id);
      setName(plan.name); setDescription(plan.description || ''); setSelected(rows.map((row) => ({ ...row, sets: String(row.sets), reps: String(row.reps) })));
      setEditingId(plan.id); setShowForm(true);
    } catch (error) { console.error(error); Alert.alert('Error', 'Could not open plan editor.'); }
  }
  function toggle(id) {
    setSelected((items) => items.some((item) => item.exercise_id === id)
      ? items.filter((item) => item.exercise_id !== id)
      : [...items, { exercise_id: id, sets: '3', reps: '12' }]);
  }
  function setNumber(id, field, value) {
    setSelected((items) => items.map((item) => item.exercise_id === id ? { ...item, [field]: value } : item));
  }
  async function save() {
    if (busy.current) return;
    if (!name.trim()) return Alert.alert('Missing name', 'Give your workout plan a name.');
    if (!selected.length) return Alert.alert('Add exercises', 'Choose at least one exercise.');
    if (selected.some((item) => !Number.isInteger(Number(item.sets)) || Number(item.sets) < 1 || Number(item.sets) > 100 || !Number.isInteger(Number(item.reps)) || Number(item.reps) < 1 || Number(item.reps) > 1000)) {
      return Alert.alert('Check sets and reps', 'Enter whole numbers greater than zero for every selected exercise.');
    }
    busy.current = true; setSaving(true);
    try {
      const db = await getDatabase();
      await db.withExclusiveTransactionAsync(async (txn) => {
        let planId = editingId;
        if (planId !== null) {
          await txn.runAsync('UPDATE workout_plans SET name = ?, description = ? WHERE id = ?', name.trim(), description.trim(), planId);
          await txn.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', planId);
        } else {
          const result = await txn.runAsync('INSERT INTO workout_plans (name, description) VALUES (?, ?)', name.trim(), description.trim());
          planId = result.lastInsertRowId;
        }
        for (const item of selected) {
          await txn.runAsync('INSERT INTO plan_exercises (plan_id, exercise_id, sets, reps) VALUES (?, ?, ?, ?)', planId, item.exercise_id, Number(item.sets), Number(item.reps));
        }
      });
      resetForm(); await load();
      Alert.alert('Saved', 'Your workout plan is ready.');
    } catch (error) { console.error(error); Alert.alert('Error', 'Unable to save the plan. Nothing was partially saved.'); }
    finally { busy.current = false; setSaving(false); }
  }

  function remove(plan) {
    Alert.alert('Delete this plan?', 'Past workouts will be kept in your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const db = await getDatabase();
          await db.withExclusiveTransactionAsync(async (txn) => {
            // Preserve the original plan name and detach past sessions first.
            await txn.runAsync('UPDATE workout_sessions SET plan_name = COALESCE(plan_name, ?) WHERE plan_id = ?', plan.name, plan.id);
            await txn.runAsync('UPDATE workout_sessions SET plan_id = NULL WHERE plan_id = ?', plan.id);
            await txn.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', plan.id);
            await txn.runAsync('DELETE FROM workout_plans WHERE id = ?', plan.id);
          });
          if (editingId === plan.id) resetForm();
          await load();
        } catch (error) { console.error(error); Alert.alert('Error', 'Could not delete the plan.'); }
      } },
    ]);
  }

  return <ScreenLayout title="Workout plans" subtitle="Create routines that work for you." scrollTopKey={showForm ? (editingId ?? 'new') : 'list'}>
    {!showForm ? <ActionButton icon="add-circle-outline" title="Create a workout plan" onPress={startCreate} /> : <View style={styles.form}>
      <View style={styles.formHeader}><Text style={styles.formTitle}>{editingId === null ? 'New workout plan' : 'Edit workout plan'}</Text><Pressable accessibilityLabel="Close plan editor" onPress={resetForm}><Ionicons name="close-circle-outline" size={26} color={colors.muted}/></Pressable></View>
      <Text style={shared.label}>PLAN NAME</Text>
      <TextInput accessibilityLabel="Plan name" style={shared.input} placeholder="e.g. Monday full body" placeholderTextColor={colors.muted} maxLength={60} value={name} onChangeText={setName} />
      <Text style={shared.label}>DESCRIPTION (OPTIONAL)</Text>
      <TextInput accessibilityLabel="Plan description" style={[shared.input, { height: 77, textAlignVertical: 'top' }]} multiline placeholder="What is this plan for?" placeholderTextColor={colors.muted} maxLength={240} value={description} onChangeText={setDescription} />
      <SectionTitle>Choose exercises · {selected.length}</SectionTitle>
      {library.map((exercise) => {
        const item = selected.find((s) => s.exercise_id === exercise.id);
        return <View key={exercise.id}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!item }} style={[styles.option, !!item && styles.optionActive]} onPress={() => toggle(exercise.id)}>
            <View style={{ flex: 1 }}><Text style={styles.optionTitle}>{exercise.name}</Text><Text style={styles.small}>{exercise.muscle_group} · {exercise.difficulty}</Text></View>
            <Ionicons name={item ? 'checkmark-circle' : 'add-circle-outline'} color={item ? colors.primary : colors.muted} size={23}/>
          </Pressable>
          {item && <View style={styles.numbers}>
            <View style={{ flex: 1 }}><Text style={shared.label}>SETS</Text><TextInput accessibilityLabel={`${exercise.name} sets`} keyboardType="number-pad" style={shared.input} value={item.sets} onChangeText={(value) => setNumber(exercise.id, 'sets', value)}/></View>
            <View style={{ flex: 1 }}><Text style={shared.label}>REPS</Text><TextInput accessibilityLabel={`${exercise.name} reps`} keyboardType="number-pad" style={shared.input} value={item.reps} onChangeText={(value) => setNumber(exercise.id, 'reps', value)}/></View>
          </View>}
        </View>;
      })}
      <ActionButton icon="checkmark-circle-outline" title={editingId === null ? 'Save plan' : 'Update plan'} loading={saving} onPress={save} style={{ marginTop: 22 }} />
      <ActionButton title="Cancel" secondary onPress={resetForm} style={{ marginTop: 10 }}/>
    </View>}

    <SectionTitle>My plans · {plans.length}</SectionTitle>
    {!plans.length ? <EmptyState icon="barbell-outline" title="No plans yet" text="Add your favorite exercises to create a custom routine." /> : plans.map((plan) =>
      <View key={plan.id} style={styles.plan}>
        <View style={styles.planRow}><View style={styles.planIcon}><Ionicons name="barbell-outline" color={colors.primary} size={24}/></View><View style={{ flex: 1 }}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.small}>{plan.exercise_count} exercise{plan.exercise_count === 1 ? '' : 's'}</Text></View></View>
        {!!plan.description && <Text style={[styles.small, { marginTop: 13 }]}>{plan.description}</Text>}
        <View style={styles.buttons}>
          <Pressable style={styles.miniButton} accessibilityRole="button" onPress={() => startEdit(plan)}><Ionicons name="create-outline" size={17} color={colors.primary}/><Text style={styles.miniText}>Edit</Text></Pressable>
          <Pressable style={styles.miniButton} accessibilityRole="button" onPress={() => navigation.navigate('Log', { startPlanId: plan.id })}><Ionicons name="play-outline" size={17} color={colors.primary}/><Text style={styles.miniText}>Start</Text></Pressable>
          <Pressable style={styles.miniButton} accessibilityRole="button" onPress={() => remove(plan)}><Ionicons name="trash-outline" size={17} color={colors.danger}/><Text style={[styles.miniText, { color: colors.danger }]}>Delete</Text></Pressable>
        </View>
      </View>
    )}
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  form: { ...shared.card, marginTop: 12 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formTitle: { ...shared.title, fontSize: 20 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 7 },
  optionActive: { borderColor: colors.primary },
  optionTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  numbers: { flexDirection: 'row', gap: 12, marginBottom: 11, paddingHorizontal: 7 },
  plan: { ...shared.card, marginBottom: 12 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIcon: { width: 49, height: 49, backgroundColor: colors.elevated, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  planName: { color: colors.text, fontSize: 17, fontWeight: '800' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 15 },
  miniButton: { flex: 1, borderRadius: 10, backgroundColor: colors.elevated, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  miniText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
});
