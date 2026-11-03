import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { Pill, EmptyState, ActionButton, shared } from '../components/UI';
import { getDatabase } from '../database/database';
import colors from '../theme/colors';
import ExerciseMovementPlayer from '../components/ExerciseMovementPlayer';

const categories = ['All', 'Strength', 'Cardio', 'Core'];
const iconFor = { Strength: 'barbell-outline', Cardio: 'heart-outline', Core: 'body-outline' };

// Metro requires static paths for bundled offline video assets.
// All 16 offline MP4 guides use AI-generated realistic-3D-LOOK human pose sequences.
// The illustrations are frame-to-frame transitions, NOT motion-captured or
// professionally verified exercise demonstrations.
const movementVideos = {
  'Push Ups': require('../assets/exercise-videos/push-ups.mp4'),
  'Bench Press': require('../assets/exercise-videos/bench-press.mp4'),
  'Squats': require('../assets/exercise-videos/squats.mp4'),
  'Pull Ups': require('../assets/exercise-videos/pull-ups.mp4'),
  'Plank': require('../assets/exercise-videos/plank.mp4'),
  'Lunges': require('../assets/exercise-videos/lunges.mp4'),
  'Bicep Curls': require('../assets/exercise-videos/bicep-curls.mp4'),
  'Jumping Jacks': require('../assets/exercise-videos/jumping-jacks.mp4'),
  'Glute Bridges': require('../assets/exercise-videos/glute-bridges.mp4'),
  'Mountain Climbers': require('../assets/exercise-videos/mountain-climbers.mp4'),
  'Bicycle Crunches': require('../assets/exercise-videos/bicycle-crunches.mp4'),
  'Calf Raises': require('../assets/exercise-videos/calf-raises.mp4'),
  'High Knees': require('../assets/exercise-videos/high-knees.mp4'),
  'Dumbbell Rows': require('../assets/exercise-videos/dumbbell-rows.mp4'),
  'Side Plank': require('../assets/exercise-videos/side-plank.mp4'),
  'Brisk Walking': require('../assets/exercise-videos/brisk-walking.mp4'),
};

export default function ExerciseLibraryScreen() {
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getDatabase().then((db) => db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC'))
      .then((rows) => { if (active) setExercises(rows); }).catch(console.error);
    return () => { active = false; };
  }, []));

  const filtered = useMemo(() => exercises.filter((exercise) =>
    (category === 'All' || exercise.category === category) &&
    [exercise.name, exercise.muscle_group, exercise.difficulty].some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  ), [exercises, search, category]);

  return <ScreenLayout title="Exercise library" subtitle="Explore movements. Everything is available offline.">
    <View style={styles.searchWrap}><Ionicons name="search-outline" size={20} color={colors.muted} />
      <TextInput accessibilityLabel="Search exercises" style={styles.searchInput} placeholder="Search name, muscle or level" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} />
      {search.length > 0 && <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={colors.muted}/></Pressable>}
    </View>
    <View style={styles.chips}>{categories.map((name) => <Pill key={name} title={name} active={category === name} onPress={() => setCategory(name)} />)}</View>
    <Text style={styles.count}>{filtered.length} EXERCISES FOUND</Text>
    {filtered.length ? filtered.map((exercise) => <Pressable key={exercise.id} onPress={() => setSelected(exercise)} accessibilityRole="button" style={({ pressed }) => [styles.exercise, pressed && { opacity: 0.7 }]}>
      <View style={styles.icon}><Ionicons name={iconFor[exercise.category] || 'fitness-outline'} size={23} color={colors.primary}/></View>
      <View style={{ flex: 1 }}><Text style={styles.name}>{exercise.name}</Text><Text style={styles.detail}>{exercise.muscle_group} · {exercise.difficulty}</Text></View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted}/>
    </Pressable>) : <EmptyState icon="search-outline" title="No matching exercises" text="Try another keyword or choose the All category." />}

    <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
      <View style={styles.modalBackdrop}><View style={styles.modalBody}>
        <View style={styles.modalHandle} />
        {selected && <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}><View style={styles.modalIcon}><Ionicons name={iconFor[selected.category] || 'fitness-outline'} size={28} color={colors.primary}/></View>
            <Pressable onPress={() => setSelected(null)} accessibilityLabel="Close exercise details"><Ionicons name="close-circle-outline" color={colors.muted} size={30}/></Pressable>
          </View>
          <Text style={styles.modalTitle}>{selected.name}</Text>
          <View style={styles.tags}><Text style={styles.tag}>{selected.category}</Text><Text style={styles.tag}>{selected.muscle_group}</Text><Text style={styles.tag}>{selected.difficulty}</Text></View>
          <ExerciseMovementPlayer key={selected.name} exerciseName={selected.name} source={movementVideos[selected.name]} mediaType="3d-look" />
          <Text style={styles.heading}>How to perform</Text><Text style={styles.description}>{selected.description}</Text>
          <ActionButton title="Got it" onPress={() => setSelected(null)} style={{ marginTop: 24 }} />
        </ScrollView>}
      </View></View>
    </Modal>
  </ScreenLayout>;
}

const styles = StyleSheet.create({
  searchWrap: { ...shared.input, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 0, fontSize: 14 },
  chips: { marginTop: 18, marginBottom: 13, flexDirection: 'row', flexWrap: 'wrap' },
  count: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: colors.muted, marginBottom: 13 },
  exercise: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, marginBottom: 9 },
  icon: { width: 47, height: 47, borderRadius: 13, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  detail: { color: colors.muted, fontSize: 12, marginTop: 6 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' },
  modalBody: { backgroundColor: colors.surface, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 22, paddingBottom: 35, maxHeight: '80%' },
  modalHandle: { width: 40, height: 5, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalIcon: { backgroundColor: colors.elevated, padding: 15, borderRadius: 17 },
  modalTitle: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 14 },
  tags: { flexDirection: 'row', gap: 7, marginTop: 16, flexWrap: 'wrap' },
  tag: { color: colors.primary, backgroundColor: colors.elevated, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 12, overflow: 'hidden', fontSize: 12, fontWeight: '800' },
  heading: { color: colors.text, fontWeight: '800', fontSize: 17, marginTop: 25, marginBottom: 10 },
  description: { color: colors.muted, lineHeight: 24, fontSize: 14 },
});
