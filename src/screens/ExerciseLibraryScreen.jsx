import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, ScrollView,} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { Pill, EmptyState, ActionButton } from '../components/UI';
import ExerciseMovementPlayer from '../components/ExerciseMovementPlayer';
import { getDatabase } from '../database/database';
import { useThemeStyles } from '../theme/ThemeProvider';

const categories = ['All', 'Strength', 'Cardio', 'Core'];

const iconFor = {
  Strength: 'barbell-outline',
  Cardio: 'heart-outline',
  Core: 'body-outline',
};

// Static requires are needed for bundled offline assets.
const movementVideos = {
  'push-ups': require('../assets/exercise-videos/push-ups.mp4'),
  'bench-press': require('../assets/exercise-videos/bench-press.mp4'),
  squats: require('../assets/exercise-videos/squats.mp4'),
  'pull-ups': require('../assets/exercise-videos/pull-ups.mp4'),
  plank: require('../assets/exercise-videos/plank.mp4'),
  lunges: require('../assets/exercise-videos/lunges.mp4'),
  'bicep-curls': require('../assets/exercise-videos/bicep-curls.mp4'),
  'jumping-jacks': require('../assets/exercise-videos/jumping-jacks.mp4'),
  'glute-bridges': require('../assets/exercise-videos/glute-bridges.mp4'),
  'mountain-climbers': require('../assets/exercise-videos/mountain-climbers.mp4'),
  'bicycle-crunches': require('../assets/exercise-videos/bicycle-crunches.mp4'),
  'calf-raises': require('../assets/exercise-videos/calf-raises.mp4'),
  'high-knees': require('../assets/exercise-videos/high-knees.mp4'),
  'dumbbell-rows': require('../assets/exercise-videos/dumbbell-rows.mp4'),
  'side-plank': require('../assets/exercise-videos/side-plank.mp4'),
  'brisk-walking': require('../assets/exercise-videos/brisk-walking.mp4'),
};

export default function ExerciseLibraryScreen() {
  const { colors, styles, shared } = useThemeStyles(createStyles);
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;

    setLoading(true);
    setError('');

    getDatabase()
      .then((db) =>
        db.getAllAsync('SELECT * FROM exercises ORDER BY name ASC')
      )
      .then((rows) => {
        if (active) setExercises(rows);
      })
      .catch((loadError) => {
        console.error(loadError);

        if (active) setError('Unable to load exercises.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      // Closing the modal also unmounts its video player.
      setSelected(null);
    };
  }, [retry]));

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return exercises.filter((exercise) =>
      (category === 'All' || exercise.category === category) &&
      [
        exercise.name,
        exercise.muscle_group,
        exercise.difficulty,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    );
  }, [exercises, search, category]);

  const videoKey = selected
    ? selected.code || selected.name.toLowerCase().replace(/ /g, '-')
    : null;

  const videoSource = videoKey ? movementVideos[videoKey] : null;

  return (
    <ScreenLayout title="Exercise library" subtitle="Explore movements. Everything is available offline.">
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.muted}/>
        <TextInput
          accessibilityLabel="Search exercises"
          style={styles.searchInput}
          placeholder="Search name, muscle or level"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />

        {search.length > 0 && (
          <Pressable accessibilityLabel="Clear search" onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.muted}/>
          </Pressable>
        )}
      </View>

      <View style={styles.chips}>
        {categories.map((name) => (
          <Pill key={name} title={name} active={category === name} onPress={() => setCategory(name)}/>
        ))}
      </View>

      {loading && (
        <Text style={shared.muted}>Loading exercises...</Text>
      )}

      {!!error && (
        <ActionButton secondary title="Retry loading exercises" onPress={() => setRetry((value) => value + 1)}/>
      )}

      <Text style={styles.count}>
        {filtered.length} EXERCISES FOUND
      </Text>

      {filtered.length ? filtered.map((exercise) => (
        <Pressable
          key={exercise.id}
          onPress={() => setSelected(exercise)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.exercise,
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={styles.icon}>
            <Ionicons name={iconFor[exercise.category] || 'fitness-outline'} size={23} color={colors.primary}/>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{exercise.name}</Text>
            <Text style={styles.detail}>
              {exercise.muscle_group} · {exercise.difficulty}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.muted}/>
        </Pressable>
      )) : (
        !loading && !error && (
          <EmptyState
            icon="search-outline"
            title="No matching exercises"
            text="Try another keyword or choose the All category."
          />
        )
      )}

      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBody}>
            <View style={styles.modalHandle} />

            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIcon}>
                    <Ionicons name={iconFor[selected.category] || 'fitness-outline'} size={28} color={colors.primary}/>
                  </View>

                  <Pressable onPress={() => setSelected(null)} accessibilityLabel="Close exercise details">
                    <Ionicons name="close-circle-outline" color={colors.muted} size={30}/>
                  </Pressable>
                </View>

                <Text style={styles.modalTitle}>{selected.name}</Text>

                <View style={styles.tags}>
                  <Text style={styles.tag}>{selected.category}</Text>
                  <Text style={styles.tag}>{selected.muscle_group}</Text>
                  <Text style={styles.tag}>{selected.difficulty}</Text>
                </View>

                {videoSource ? (
                  <ExerciseMovementPlayer
                    key={selected.name}
                    exerciseName={selected.name}
                    source={videoSource}
                    mediaType="3d-look"
                  />
                ) : (
                  <Text style={shared.muted}>
                    No video is available for this exercise.
                  </Text>
                )}

                <Text style={styles.heading}>How to perform</Text>
                <Text style={styles.description}>
                  {selected.description}
                </Text>

                <ActionButton title="Got it" onPress={() => setSelected(null)} style={{ marginTop: 24 }}/>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const createStyles = (colors, shared) => StyleSheet.create({
  searchWrap: {
    ...shared.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 0,
    fontSize: 14,
  },
  chips: {
    marginTop: 18,
    marginBottom: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  count: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: colors.muted,
    marginBottom: 13,
  },
  exercise: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 9,
  },
  icon: {
    width: 47,
    height: 47,
    borderRadius: 13,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { 
    color: colors.text, 
    fontWeight: '800', 
    fontSize: 15 
  },
  detail: { 
    color: colors.muted, 
    fontSize: 12, 
    marginTop: 6 
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#0009',
  },
  modalBody: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 22,
    paddingBottom: 35,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 4,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalIcon: {
    backgroundColor: colors.elevated,
    padding: 15,
    borderRadius: 17,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
  },
  tags: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  tag: {
    color: colors.primary,
    backgroundColor: colors.elevated,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '800',
  },
  heading: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
    marginTop: 25,
    marginBottom: 10,
  },
  description: {
    color: colors.muted,
    lineHeight: 24,
    fontSize: 14,
  },
});