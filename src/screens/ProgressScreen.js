import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { SectionTitle, StatTile, EmptyState, ActionButton, shared } from '../components/UI';
import { getDatabase } from '../database/database';
import colors from '../theme/colors';

export default function ProgressScreen() {
  const [stats, setStats] = useState({ workouts: 0, minutes: 0, volume: 0, average: 0 });
  const [history, setHistory] = useState([]);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      const [total, volume, rows] = await Promise.all([
        db.getFirstAsync('SELECT COUNT(*) AS workouts, COALESCE(SUM(duration), 0) AS minutes FROM workout_sessions'),
        db.getFirstAsync('SELECT COALESCE(SUM(sets * reps * weight), 0) AS volume FROM workout_records'),
        db.getAllAsync('SELECT id, weight, recorded_date FROM body_progress ORDER BY id DESC LIMIT 8'),
      ]);
      setStats({ workouts: total.workouts, minutes: total.minutes, volume: volume.volume, average: total.workouts ? Math.round(total.minutes / total.workouts) : 0 });
      setHistory(rows.reverse());
    } catch (error) { console.error('Progress:', error); Alert.alert('Error', 'Unable to load your progress.'); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function saveWeight() {
    const value = Number(weight);
    if (!weight.trim() || !Number.isFinite(value) || value <= 0 || value > 500) return Alert.alert('Invalid body weight', 'Enter a number between 0 and 500 kg.');
    if (saving) return;
    setSaving(true);
    try {
      const db = await getDatabase();
      await db.runAsync('INSERT INTO body_progress (weight) VALUES (?)', value);
      setWeight(''); await load();
      Alert.alert('Saved', 'Body weight added to your local progress history.');
    } catch (error) { console.error(error); Alert.alert('Error', 'Could not save your weight.'); }
    finally { setSaving(false); }
  }
  const latest = history.length ? history[history.length - 1].weight : null;
  const first = history.length ? history[0].weight : null;
  const delta = history.length > 1 ? latest - first : null;
  const min = history.length ? Math.min(...history.map((row) => row.weight)) : 0;
  const max = history.length ? Math.max(...history.map((row) => row.weight)) : 1;
  const range = Math.max(max - min, 1);

  return <ScreenLayout title="Your progress" subtitle="Your effort, measured over time.">
    <SectionTitle>Training insights</SectionTitle>
    <View style={styles.grid}>
      <StatTile icon="checkmark-done-outline" label="Total workouts" value={stats.workouts} />
      <StatTile icon="time-outline" label="Minutes trained" value={stats.minutes} />
      <StatTile icon="barbell-outline" label="Total volume (kg)" value={Number(stats.volume).toFixed(1)} />
      <StatTile icon="speedometer-outline" label="Average min / session" value={stats.average} />
    </View>

    <SectionTitle>Body weight tracker</SectionTitle>
    <View style={styles.weightCard}>
      <View style={styles.headingRow}><View><Text style={styles.weightLabel}>LAST RECORDED WEIGHT</Text><Text style={styles.weightValue}>{latest === null ? '—' : latest} <Text style={styles.unit}>kg</Text></Text></View><Ionicons name="scale-outline" size={34} color={colors.primary}/></View>
      <Text style={styles.delta}>{delta === null ? 'Add measurements to see your trend.' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg across your last ${history.length} records`}</Text>
      <Text style={shared.label}>ADD A MEASUREMENT (KG)</Text>
      <TextInput accessibilityLabel="Body weight in kilograms" style={shared.input} placeholder="e.g. 65.5" placeholderTextColor={colors.muted} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
      <ActionButton icon="add-circle-outline" title="Save measurement" loading={saving} onPress={saveWeight} style={{ marginTop: 12 }} />
    </View>

    <SectionTitle>Weight history</SectionTitle>
    {!history.length ? <EmptyState icon="analytics-outline" title="Nothing to chart yet" text="Save your first weight measurement to see a local history."/> : <View style={styles.chartCard}>
      <Text style={styles.chartHint}>LAST {history.length} MEASUREMENTS</Text>
      <View style={styles.chart}>
        {history.map((item) => {
          const barHeight = 28 + ((item.weight - min) / range) * 104;
          return <View key={item.id} style={styles.barGroup}>
            <Text style={styles.barLabel} numberOfLines={1}>{item.weight}</Text>
            <View style={[styles.bar, { height: barHeight }]} />
            <Text style={styles.barDate}>{item.recorded_date.slice(5, 10)}</Text>
          </View>;
        })}
      </View>
      <Text style={styles.chartFoot}>Bars show the relative difference between measurements, not a zero-based scale.</Text>
    </View>}
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  weightCard: { ...shared.card },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weightLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  weightValue: { color: colors.primary, fontSize: 37, fontWeight: '900', marginTop: 9 },
  unit: { color: colors.muted, fontSize: 17 },
  delta: { color: colors.muted, fontSize: 12, marginTop: 8, marginBottom: 9 },
  chartCard: { ...shared.card, paddingVertical: 22 },
  chartHint: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  chart: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', height: 190, paddingTop: 26, paddingBottom: 20 },
  barGroup: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 },
  barLabel: { color: colors.text, fontSize: 10, fontWeight: '800', marginBottom: 6 },
  bar: { backgroundColor: colors.primary, borderRadius: 7, width: '75%', maxWidth: 34, minWidth: 10 },
  barDate: { color: colors.muted, fontSize: 9, marginTop: 9 },
  chartFoot: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
});
