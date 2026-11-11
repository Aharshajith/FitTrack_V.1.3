import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator,Pressable,StyleSheet,Text,View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { EmptyState, SectionTitle } from '../components/UI';
import DashboardWeeklyChart from '../components/DashboardWeeklyChart';
import { getDatabase } from '../database/database';
import { useThemeStyles } from '../theme/ThemeProvider';
import { formatRecentDate,greetingForHour,weekBounds,weeklyActivity } from '../utils/dashboardMetrics';

const INITIAL_STATS = {
  workouts: 0,
  minutes: 0,
  weight: null,
  plans: 0,
  name: 'Athlete',
  goal: null,
};

function StatCard({ icon, label, value, suffix, note }) {
  const { colors, styles } = useThemeStyles(createStyles);

  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>
        <View style={styles.statIconBox}>
          <Ionicons name={icon} size={21} color={colors.primary}/>
        </View>
        <View style={styles.statIndicator} />
      </View>

      <View style={styles.statNumberRow}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
          {value}
        </Text>

        {!!suffix && ( <Text style={styles.statSuffix}>{suffix}</Text> )}
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.statFootRow}>
        <Ionicons name="ellipse" size={7} color={colors.primary}/>
        <Text style={styles.statNote} numberOfLines={1}>
          {note}
        </Text>
      </View>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { colors, styles, shared } = useThemeStyles(createStyles);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [recent, setRecent] = useState([]);
  const [weeklySessions, setWeeklySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(() => new Date());

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const now = new Date();

      setToday(now);
      setLoading(true);
      setError(false);

      async function loadDashboard() {
        try {
          const db = await getDatabase();
          const { fromUTC, untilUTC } = weekBounds(now);

          const [
            total,
            profile,
            weight,
            plans,
            sessions,
            weekRows,
          ] = await Promise.all([
            db.getFirstAsync(
              'SELECT COUNT(*) AS workouts, COALESCE(SUM(duration), 0) AS duration FROM workout_sessions'
            ),
            db.getFirstAsync(
              'SELECT name, fitness_goal FROM user_profile ORDER BY id DESC LIMIT 1'
            ),
            db.getFirstAsync(
              'SELECT weight FROM body_progress ORDER BY id DESC LIMIT 1'
            ),
            db.getFirstAsync(
              'SELECT COUNT(*) AS count FROM workout_plans'
            ),
            db.getAllAsync(
              "SELECT id, COALESCE(plan_name, 'Workout') AS name, duration, date FROM workout_sessions ORDER BY id DESC LIMIT 3"
            ),
            db.getAllAsync(
              'SELECT date, duration FROM workout_sessions WHERE date >= ? AND date < ? ORDER BY date ASC',
              fromUTC,
              untilUTC
            ),
          ]);

          if (!active) return;

          setStats({
            workouts: Number(total?.workouts ?? 0),
            minutes: Number(total?.duration ?? 0),
            weight: weight?.weight ?? null,
            plans: Number(plans?.count ?? 0),
            name: profile?.name?.trim() || 'Athlete',
            goal: profile?.fitness_goal?.trim() || null,
          });

          setRecent(sessions || []);
          setWeeklySessions(weekRows || []);
        } catch (loadError) {
          console.error('Dashboard:', loadError);

          if (active) setError(true);
        } finally {
          if (active) setLoading(false);
        }
      }

      loadDashboard();

      return () => {
        active = false;
      };
    }, [retry])
  );

  const week = useMemo(
    () => weeklyActivity(weeklySessions, today),
    [weeklySessions, today]
  );

  const firstName = stats.name.split(/\s+/)[0] || 'Athlete';

  return (
    <ScreenLayout
      title="Your dashboard"
      subtitle="Your training, clearly in view."
    >
      {/* Welcome */}
      <View style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />

        <View style={styles.heroTopline}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles-outline" size={13} color={colors.primary}/>
            <Text style={styles.heroBadgeText}>YOUR FITNESS SPACE</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.greeting}>{greetingForHour(today.getHours())},</Text>
        <Text style={styles.heroName} numberOfLines={1}>{firstName} <Text style={styles.wave}>👋</Text></Text>
        <Text style={styles.heroMessage}>Every workout counts. Keep showing up for yourself.</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log a workout"
          onPress={() => navigation.navigate('Log')}
          style={({ pressed }) => [
            styles.logButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={21} color={colors.primaryDark}/>
          <Text style={styles.logButtonLabel}>Log a Workout</Text>

          <Ionicons name="arrow-forward" size={18} color={colors.primaryDark}/>
        </Pressable>
      </View>

      {/* Fitness goal */}
      <View style={styles.goalCard}>
        <View style={styles.goalLightRing} />

        <View style={styles.goalTopRow}>
          <View style={styles.goalIconOuter}>
            <Ionicons name="flag" size={23} color={colors.primaryDark}/>
          </View>

          <View style={styles.goalTopText}>
            <Text style={styles.goalOverline}>YOUR PERSONAL TARGET</Text>
            <Text style={styles.goalHeading}>Fitness Goal</Text>
          </View>

          <View style={styles.goalSavedTag}>
            <Ionicons
              name={ stats.goal ? 'checkmark-circle' : 'create-outline'}
              size={13}
              color={colors.primary}
            />

            <Text style={styles.goalSavedText}>{stats.goal ? 'Saved' : 'Not set'}</Text>
          </View>
        </View>

        <View style={styles.goalBody}>
          <Text style={styles.goalText}>{stats.goal || 'Set a fitness goal to personalize your journey.'}</Text>
          <Text style={styles.goalSubtext}>
            {stats.goal
              ? 'Your goal is saved in your profile. Track your activity below.'
              : 'Your profile is the place to add or edit your goal.'}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            stats.goal ? 'Edit fitness goal' : 'Set fitness goal'
          }
          onPress={() => navigation.navigate('Me')}
          style={({ pressed }) => [
            styles.goalAction,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.goalActionText}>{stats.goal ? 'Edit goal' : 'Set goal'}</Text>
          <Ionicons name="arrow-forward-outline" size={16} color={colors.primary}/>
        </Pressable>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading your activity...</Text>
        </View>
      )}

      {error && (
        <Pressable accessibilityRole="button" onPress={() => setRetry((count) => count + 1)} style={styles.errorBox}>
          <Ionicons name="refresh-circle-outline" size={24} color={colors.primary}/>

          <Text style={styles.errorText}>Could not load activity. Tap to retry.</Text>
        </Pressable>
      )}

      {!loading && !error && (
        <>
          {/* At a glance */}
          <SectionTitle>At a glance</SectionTitle>

          <View style={styles.statGrid}>
            <StatCard
              icon="fitness-outline"
              label="Total workouts"
              value={stats.workouts.toLocaleString()}
              note="Sessions logged"
            />

            <StatCard
              icon="time-outline"
              label="Training time"
              value={stats.minutes.toLocaleString()}
              suffix="min"
              note="All-time minutes"
            />

            <StatCard
              icon="scale-outline"
              label="Current weight"
              value={
                stats.weight === null
                  ? '—'
                  : String(stats.weight)
              }
              suffix={stats.weight === null ? '' : 'kg'}
              note={
                stats.weight === null
                  ? 'No entry yet'
                  : 'Latest entry'
              }
            />

            <StatCard
              icon="layers-outline"
              label="Workout plans"
              value={stats.plans.toLocaleString()}
              note="Plans created"
            />
          </View>

          {/* Weekly activity */}
          <SectionTitle action="View more" onAction={() => navigation.navigate('Progress')}>
            Weekly activity
          </SectionTitle>

          <View style={styles.weeklyCard}>
            <View style={styles.weeklyHeading}>
              <View>
                <Text style={styles.weekOverline}>THIS WEEK · MON–SUN</Text>
                <Text style={styles.weekCount}>
                  {week.totalWorkouts}{' '}
                  <Text style={styles.weekCountUnit}> workout{week.totalWorkouts === 1 ? '' : 's'} </Text>
                </Text>
              </View>

              <View style={styles.consistency}>
                <Text style={styles.consistencyNumber}>{week.activeDays} / 7</Text>
                <Text style={styles.consistencyLabel}> days active</Text>
              </View>
            </View>

            <DashboardWeeklyChart days={week.days} />

            <View style={styles.weekFooter}>
              <View style={styles.weekIndicator}>
                <View style={styles.legendDot} />

                <Text style={styles.weekFootText}> Sessions per day </Text>
              </View>
              <Text style={styles.weekFootText}> {week.totalMinutes} min this week </Text>
            </View>
          </View>

          {/* Recent activity */}
          <SectionTitle action="View progress" onAction={() => navigation.navigate('Progress')}>
            Recent activity
          </SectionTitle>

          {recent.length ? (
            recent.map((item) => (
              <View style={styles.activity} key={item.id}>
                <View style={styles.activityIcon}>
                  <Ionicons name="checkmark" color={colors.primaryDark} size={17}/>
                </View>

                <View style={styles.activityCopy}>
                  <Text style={styles.activityName} numberOfLines={1}> {item.name} </Text>
                  <Text style={styles.activityDate}> {formatRecentDate(item.date, today)} </Text>
                </View>

                <View style={styles.activityTime}>
                  <Ionicons name="time-outline" color={colors.primary} size={15}/>
                  <Text style={styles.activityDuration}> {item.duration ?? 0} min </Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyState
              icon="fitness-outline"
              title="Your first workout awaits"
              text="Create a plan and log a workout to start seeing your activity here."
            />
          )}
        </>
      )}
    </ScreenLayout>
  );
}

const createStyles = (colors) => StyleSheet.create({
  pressed: {
    opacity: 0.75,
  },

  hero: {
    backgroundColor: colors.hero,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 19,
    overflow: 'hidden',
  },

  heroOrbLarge: {
    position: 'absolute',
    right: -92,
    top: -122,
    width: 265,
    height: 265,
    borderRadius: 140,
    backgroundColor: colors.elevated,
  },

  heroOrbSmall: {
    position: 'absolute',
    right: -105,
    top: 90,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.elevated,
    opacity: 0.35,
  },

  heroTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 100,
  },

  heroBadgeText: {
    fontSize: 10,
    letterSpacing: 0.9,
    fontWeight: '900',
    color: colors.primary,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  avatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  greeting: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 22,
  },

  heroName: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },

  wave: {
    fontSize: 23,
    color: colors.text,
  },

  heroMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 6,
    maxWidth: '90%',
  },

  logButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primary,
  },

  logButtonLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primaryDark,
  },

  goalCard: {
    marginTop: 14,
    backgroundColor: colors.hero,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    overflow: 'hidden',
  },

  goalLightRing: {
    position: 'absolute',
    right: -65,
    top: -105,
    width: 205,
    height: 205,
    borderRadius: 108,
    borderWidth: 26,
    borderColor: colors.border,
  },

  goalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  goalIconOuter: {
    width: 47,
    height: 47,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  goalTopText: {
    flex: 1,
    minWidth: 0,
  },

  goalOverline: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.15,
  },

  goalHeading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  goalSavedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: colors.elevated,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },

  goalSavedText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },

  goalBody: {
    marginTop: 16,
  },

  goalText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 26,
  },

  goalSubtext: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  goalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginTop: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },

  goalActionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },

  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 20,
  },

  loadingText: {
    color: colors.muted,
    fontSize: 13,
  },

  errorBox: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  errorText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },

  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  statIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIndicator: {
    width: 6,
    height: 6,
    backgroundColor: colors.primary,
    borderRadius: 3,
    opacity: 0.75,
  },

  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 13,
  },

  statValue: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.3,
    flexShrink: 1,
  },

  statSuffix: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  statLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  statFootRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statNote: {
    color: colors.muted,
    fontSize: 10,
    flexShrink: 1,
  },

  weeklyCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 21,
    padding: 18,
  },

  weeklyHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  weekOverline: {
    color: colors.muted,
    letterSpacing: 0.9,
    fontSize: 10,
    fontWeight: '800',
  },

  weekCount: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 6,
  },

  weekCountUnit: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },

  consistency: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 16,
    backgroundColor: colors.elevated,
  },

  consistencyNumber: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },

  consistencyLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 2,
  },

  weekFooter: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 13,
    marginTop: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  weekIndicator: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  weekFootText: {
    color: colors.muted,
    fontSize: 11,
  },

  activity: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 9,
  },

  activityIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  activityCopy: {
    flex: 1,
  },

  activityName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  activityDate: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },

  activityTime: {
    backgroundColor: colors.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },

  activityDuration: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
});