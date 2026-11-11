import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { ActionButton, EmptyState, SectionTitle } from '../components/UI';
import { getDatabase, withDatabaseTransaction } from '../database/database';
import { useThemeStyles } from '../theme/ThemeProvider';

export default function WorkoutPlansScreen({ navigation }) {
  const { colors, styles, shared } = useThemeStyles(createStyles);
  const [plans, setPlans] = useState([]);
  const [library, setLibrary] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const busy = useRef(false);
  const dirty = useRef(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++request.current;
    setLoading(true);
    setLoadError('');

    try {
      const db = await getDatabase();

      const [saved, available] = await Promise.all([
        db.getAllAsync(`
          SELECT p.*,
            (
              SELECT COUNT(*)
              FROM plan_exercises
              WHERE plan_id = p.id
            ) AS exercise_count
          FROM workout_plans p
          ORDER BY p.id DESC
        `),
        db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC'),
      ]);

      if (ticket !== request.current) return;

      setPlans(saved);
      setLibrary(available);
    } catch (error) {
      console.error(error);

      if (ticket === request.current) {
        setLoadError('Unable to refresh data. Please retry.');
      }
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();

    return () => {
      request.current += 1;
    };
  }, [load]));

  function resetForm() {
    dirty.current = false;
    setEditingId(null);
    setName('');
    setDescription('');
    setSelected([]);
    setShowForm(false);
  }

  function confirmDiscard(action) {
    if (busy.current) return;

    if (!dirty.current) {
      action();
      return;
    }

    Alert.alert(
      'Discard plan edits?',
      'Your unsaved changes will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (!busy.current) action();
          },
        },
      ]
    );
  }

  function startCreate() {
    confirmDiscard(() => {
      resetForm();
      setShowForm(true);
    });
  }

  async function startEdit(plan) {
    if (busy.current) return;

    busy.current = true;
    setSaving(true);

    try {
      const db = await getDatabase();

      const current = await db.getFirstAsync(
        'SELECT * FROM workout_plans WHERE id = ?',
        plan.id
      );

      if (!current) {
        throw new Error('This plan no longer exists.');
      }

      const rows = await db.getAllAsync(
        `SELECT exercise_id, sets, reps
         FROM plan_exercises
         WHERE plan_id = ?
         ORDER BY id`,
        plan.id
      );

      dirty.current = false;
      setName(current.name);
      setDescription(current.description || '');

      setSelected(rows.map((row) => ({
        ...row,
        sets: String(row.sets),
        reps: String(row.reps),
      })));

      setEditingId(plan.id);
      setShowForm(true);
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'Could not open this plan. Refresh and try again.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function toggle(id) {
    if (busy.current) return;

    dirty.current = true;

    setSelected((items) =>
      items.some((item) => item.exercise_id === id)
        ? items.filter((item) => item.exercise_id !== id)
        : [...items, { exercise_id: id, sets: '3', reps: '12' }]
    );
  }

  function setNumber(id, field, value) {
    if (busy.current) return;

    dirty.current = true;

    setSelected((items) =>
      items.map((item) =>
        item.exercise_id === id
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  async function save() {
    if (busy.current) return;

    if (!name.trim()) {
      return Alert.alert(
        'Missing name',
        'Give your workout plan a name.'
      );
    }

    if (!selected.length) {
      return Alert.alert(
        'Add exercises',
        'Choose at least one exercise.'
      );
    }

    const invalid = selected.some((item) =>
      !Number.isInteger(Number(item.sets)) ||
      Number(item.sets) < 1 ||
      Number(item.sets) > 100 ||
      !Number.isInteger(Number(item.reps)) ||
      Number(item.reps) < 1 ||
      Number(item.reps) > 1000
    );

    if (invalid) {
      return Alert.alert(
        'Check sets and reps',
        'Use 1–100 sets and 1–1000 reps, as whole numbers.'
      );
    }

    busy.current = true;
    setSaving(true);

    try {
      await withDatabaseTransaction(async (txn) => {
        let planId = editingId;

        if (planId !== null) {
          const exists = await txn.getFirstAsync(
            'SELECT id FROM workout_plans WHERE id = ?',
            planId
          );

          if (!exists) {
            throw new Error('Plan no longer exists');
          }

          await txn.runAsync(
            `UPDATE workout_plans
             SET name = ?, description = ?
             WHERE id = ?`,
            name.trim(),
            description.trim(),
            planId
          );

          await txn.runAsync(
            'DELETE FROM plan_exercises WHERE plan_id = ?',
            planId
          );
        } else {
          const result = await txn.runAsync(
            `INSERT INTO workout_plans (name, description)
             VALUES (?, ?)`,
            name.trim(),
            description.trim()
          );

          planId = result.lastInsertRowId;
        }

        for (const item of selected) {
          await txn.runAsync(
            `INSERT INTO plan_exercises
               (plan_id, exercise_id, sets, reps)
             VALUES (?, ?, ?, ?)`,
            planId,
            item.exercise_id,
            Number(item.sets),
            Number(item.reps)
          );
        }
      });

      resetForm();
      await load();

      Alert.alert('Saved', 'Your workout plan is ready.');
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'Unable to save the plan. Nothing was partially saved.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function remove(plan) {
    if (busy.current) return;

    Alert.alert(
      'Delete this plan?',
      'Past workouts will be kept in your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (busy.current) return;

            busy.current = true;
            setSaving(true);

            try {
              await withDatabaseTransaction(async (txn) => {
                await txn.runAsync(
                  `UPDATE workout_sessions
                   SET plan_name = COALESCE(plan_name, ?)
                   WHERE plan_id = ?`,
                  plan.name,
                  plan.id
                );

                await txn.runAsync(
                  `UPDATE workout_sessions
                   SET plan_id = NULL
                   WHERE plan_id = ?`,
                  plan.id
                );

                await txn.runAsync(
                  'DELETE FROM plan_exercises WHERE plan_id = ?',
                  plan.id
                );

                await txn.runAsync(
                  'DELETE FROM workout_plans WHERE id = ?',
                  plan.id
                );
              });

              if (editingId === plan.id) resetForm();

              await load();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Could not delete the plan.');
            } finally {
              busy.current = false;
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScreenLayout
      title="Workout plans"
      subtitle="Create routines that work for you."
      scrollTopKey={showForm ? (editingId ?? 'new') : 'list'}
    >
      {loading && <Text style={shared.muted}>Loading...</Text>}

      {!!loadError && (
        <ActionButton
          secondary
          title="Retry loading data"
          onPress={load}
        />
      )}

      {!showForm ? (
        <ActionButton
          icon="add-circle-outline"
          title="Create a workout plan"
          disabled={saving || loading || !!loadError}
          onPress={startCreate}
        />
      ) : (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId === null ? 'New workout plan' : 'Edit workout plan'}
            </Text>

            <Pressable
              accessibilityLabel="Close plan editor"
              disabled={saving}
              onPress={() => confirmDiscard(resetForm)}
            >
              <Ionicons
                name="close-circle-outline"
                size={26}
                color={colors.muted}
              />
            </Pressable>
          </View>

          <Text style={shared.label}>PLAN NAME</Text>
          <TextInput
            accessibilityLabel="Plan name"
            style={shared.input}
            placeholder="e.g. Monday full body"
            placeholderTextColor={colors.muted}
            maxLength={60}
            value={name}
            editable={!saving}
            onChangeText={(value) => {
              dirty.current = true;
              setName(value);
            }}
          />

          <Text style={shared.label}>DESCRIPTION (OPTIONAL)</Text>
          <TextInput
            accessibilityLabel="Plan description"
            style={[shared.input, { height: 77, textAlignVertical: 'top' }]}
            multiline
            placeholder="What is this plan for?"
            placeholderTextColor={colors.muted}
            maxLength={240}
            value={description}
            editable={!saving}
            onChangeText={(value) => {
              dirty.current = true;
              setDescription(value);
            }}
          />

          <SectionTitle>
            Choose exercises · {selected.length}
          </SectionTitle>

          {library.map((exercise) => {
            const item = selected.find(
              (entry) => entry.exercise_id === exercise.id
            );

            return (
              <View key={exercise.id}>
                <Pressable
                  disabled={saving}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!item }}
                  style={[styles.option, !!item && styles.optionActive]}
                  onPress={() => toggle(exercise.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{exercise.name}</Text>
                    <Text style={styles.small}>
                      {exercise.muscle_group} · {exercise.difficulty}
                    </Text>
                  </View>

                  <Ionicons
                    name={item ? 'checkmark-circle' : 'add-circle-outline'}
                    color={item ? colors.primary : colors.muted}
                    size={23}
                  />
                </Pressable>

                {item && (
                  <View style={styles.numbers}>
                    {['sets', 'reps'].map((field) => (
                      <View key={field} style={{ flex: 1 }}>
                        <Text style={shared.label}>
                          {field.toUpperCase()}
                        </Text>
                        <TextInput
                          accessibilityLabel={`${exercise.name} ${field}`}
                          editable={!saving}
                          keyboardType="number-pad"
                          style={shared.input}
                          value={item[field]}
                          onChangeText={(value) =>
                            setNumber(exercise.id, field, value)
                          }
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <ActionButton
            icon="checkmark-circle-outline"
            title={editingId === null ? 'Save plan' : 'Update plan'}
            loading={saving}
            onPress={save}
            style={{ marginTop: 22 }}
          />

          <ActionButton
            title="Cancel"
            secondary
            disabled={saving}
            onPress={() => confirmDiscard(resetForm)}
            style={{ marginTop: 10 }}
          />
        </View>
      )}

      <SectionTitle>My plans · {plans.length}</SectionTitle>

      {!plans.length ? (
        loading || loadError ? null : (
          <EmptyState
            icon="barbell-outline"
            title="No plans yet"
            text="Add your favorite exercises to create a custom routine."
          />
        )
      ) : plans.map((plan) => (
        <View key={plan.id} style={styles.plan}>
          <View style={styles.planRow}>
            <View style={styles.planIcon}>
              <Ionicons
                name="barbell-outline"
                color={colors.primary}
                size={24}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.small}>
                {plan.exercise_count} exercise
                {plan.exercise_count === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {!!plan.description && (
            <Text style={[styles.small, { marginTop: 13 }]}>
              {plan.description}
            </Text>
          )}

          <View style={styles.buttons}>
            <Pressable
              style={styles.miniButton}
              accessibilityRole="button"
              disabled={saving}
              onPress={() => confirmDiscard(() => startEdit(plan))}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={colors.primary}
              />
              <Text style={styles.miniText}>Edit</Text>
            </Pressable>

            <Pressable
              style={styles.miniButton}
              accessibilityRole="button"
              disabled={saving}
              onPress={() =>
                navigation.navigate('Log', { startPlanId: plan.id })
              }
            >
              <Ionicons
                name="play-outline"
                size={17}
                color={colors.primary}
              />
              <Text style={styles.miniText}>Start</Text>
            </Pressable>

            <Pressable
              style={styles.miniButton}
              accessibilityRole="button"
              disabled={saving}
              onPress={() => remove(plan)}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={colors.danger}
              />
              <Text style={[styles.miniText, { color: colors.danger }]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScreenLayout>
  );
}

const createStyles = (colors, shared) => StyleSheet.create({
  form: { 
    ...shared.card, 
    marginTop: 12 
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formTitle: { 
    ...shared.title, 
    fontSize: 20 
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 7,
  },
  optionActive: { 
    borderColor: colors.primary 
  },
  optionTitle: { 
    color: colors.text, 
    fontWeight: '700', 
    fontSize: 14 
  },
  small: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  numbers: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 11,
    paddingHorizontal: 7,
  },
  plan: { 
    ...shared.card, 
    marginBottom: 12 
  },
  planRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  planIcon: {
    width: 49,
    height: 49,
    backgroundColor: colors.elevated,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: { 
    color: colors.text, 
    fontSize: 17, 
    fontWeight: '800' 
  },
  buttons: { 
    flexDirection: 'row', 
    gap: 8, 
    marginTop: 15 
  },
  miniButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  miniText: { 
    color: colors.primary, 
    fontSize: 12, 
    fontWeight: '800' 
  },
});