import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { SectionTitle, StatTile, EmptyState, ActionButton, shared } from '../components/UI';
import { getDatabase, withDatabaseTransaction } from '../database/database';
import { parseSessionDate } from '../utils/dashboardMetrics';
import colors from '../theme/colors';

export default function ProgressScreen() {
  const [stats, setStats] = useState({ workouts: 0, minutes: 0, volume: 0, average: 0 });
  const [history, setHistory] = useState([]);
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const busy = useRef(false);
  const request = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++request.current;
    setLoading(true);
    setLoadError('');

    try {
      const db = await getDatabase();

      const [total, volume, rows] = await Promise.all([
        db.getFirstAsync(`
          SELECT COUNT(*) AS workouts,
                 COALESCE(SUM(duration), 0) AS minutes
          FROM workout_sessions
        `),
        db.getFirstAsync(`
          SELECT COALESCE(SUM(sets * reps * weight), 0) AS volume
          FROM workout_records
        `),
        db.getAllAsync(`
          SELECT id, weight, recorded_date
          FROM body_progress
          ORDER BY id DESC
          LIMIT 8
        `),
      ]);

      if (ticket !== request.current) return;

      setStats({
        workouts: total.workouts,
        minutes: total.minutes,
        volume: volume.volume,
        average: total.workouts
          ? Math.round(total.minutes / total.workouts)
          : 0,
      });

      setHistory(rows.reverse());
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

  async function saveWeight() {
    const value = Number(weight);

    if (!weight.trim() || !Number.isFinite(value) || value <= 0 || value > 500) {
      return Alert.alert(
        'Invalid body weight',
        'Enter a weight greater than 0 and no more than 500 kg.'
      );
    }
    if (busy.current) return;

    busy.current = true;
    setSaving(true);

    try {
      await withDatabaseTransaction((txn) =>
        txn.runAsync(
          'INSERT INTO body_progress (weight) VALUES (?)',
          value
        )
      );

      setWeight('');
      await load();

      Alert.alert(
        'Saved',
        'Body weight added to your local progress history.'
      );
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save your weight.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const latest = history.length ? history[history.length - 1].weight : null;
  const first = history.length ? history[0].weight : null;
  const delta = history.length > 1 ? latest - first : null;
  const min = history.length ? Math.min(...history.map((row) => row.weight)) : 0;
  const max = history.length ? Math.max(...history.map((row) => row.weight)) : 1;
  const range = Math.max(max - min, 1);

  return (
    <ScreenLayout title="Your progress" subtitle="Your effort, measured over time.">
      {loading && <Text style={shared.muted}>Loading...</Text>}

      {!!loadError && (
        <ActionButton secondary title="Retry loading data" onPress={load}/>
      )}

      <SectionTitle>Training insights</SectionTitle>

      <View style={styles.grid}>
        <StatTile icon="checkmark-done-outline" label="Total workouts" value={stats.workouts}/>
        <StatTile icon="time-outline" label="Minutes trained" value={stats.minutes}/>
        <StatTile icon="barbell-outline" label="Total volume (kg)" value={Number(stats.volume).toFixed(1)}/>
        <StatTile icon="speedometer-outline" label="Average min / session" value={stats.average}/>
      </View>

      <SectionTitle>Body weight tracker</SectionTitle>

      <View style={styles.weightCard}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.weightLabel}>LAST RECORDED WEIGHT</Text>
            <Text style={styles.weightValue}>
              {latest === null ? '—' : latest}{' '}
              <Text style={styles.unit}>kg</Text>
            </Text>
          </View>

          <Ionicons name="scale-outline" size={34} color={colors.primary}/>
        </View>

        <Text style={styles.delta}>
          {delta === null
            ? 'Add measurements to see your trend.'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg across your last ${history.length} records`}
        </Text>

        <Text style={shared.label}>ADD A MEASUREMENT (KG)</Text>

        <TextInput
          accessibilityLabel="Body weight in kilograms"
          style={shared.input}
          placeholder="e.g. 65.5"
          placeholderTextColor={colors.muted}
          editable={!saving}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />

        <ActionButton
          icon="add-circle-outline"
          title="Save measurement"
          loading={saving}
          onPress={saveWeight}
          style={{ marginTop: 12 }}
        />
      </View>

      <SectionTitle>Weight history</SectionTitle>

      {!history.length ? (
        loading || loadError ? null : (
          <EmptyState
            icon="analytics-outline"
            title="Nothing to chart yet"
            text="Save your first weight measurement to see a local history."
          />
        )
      ) : (
        <View style={styles.chartCard}>
          <Text style={styles.chartHint}>
            LAST {history.length} MEASUREMENTS
          </Text>

          <View style={styles.chart}>
            {history.map((item) => {
              const barHeight =
                28 + ((item.weight - min) / range) * 104;

              const label = parseSessionDate(item.recorded_date)
                ?.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                }) || '—';

              return (
                <View key={item.id} style={styles.barGroup}>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {item.weight}
                  </Text>

                  <View style={[styles.bar, { height: barHeight }]} />

                  <Text style={styles.barDate}>{label}</Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.chartFoot}>
            Bars show the relative difference between measurements,
            not a zero-based scale.
          </Text>
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 11 
  },
  weightCard: { 
    ...shared.card 
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weightLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  weightValue: {
    color: colors.primary,
    fontSize: 37,
    fontWeight: '900',
    marginTop: 9,
  },
  unit: { 
    color: colors.muted, 
    fontSize: 17 
  },
  delta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 9,
  },
  chartCard: { 
    ...shared.card, 
    paddingVertical: 22 
  },
  chartHint: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  chart: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    height: 190,
    paddingTop: 26,
    paddingBottom: 20,
  },
  barGroup: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  barLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: 7,
    width: '75%',
    maxWidth: 34,
    minWidth: 10,
  },
  barDate: { 
    color: colors.muted, 
    fontSize: 9, 
    marginTop: 9 
  },
  chartFoot: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
});