
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

// Displays completed workout sessions per weekday.
export default function DashboardWeeklyChart({ days }) {
  const maximum = Math.max(
    1,
    ...days.map((day) => day.count)
  );

  const hasActivity = days.some((day) => day.count > 0);

  return (
    <View>
      <View
        style={styles.chart}
        accessibilityLabel="Workout sessions by day this week"
      >
        {days.map((day) => {
          const height = Math.max(
            0,
            Math.round((day.count / maximum) * 104)
          );

          return (
            <View key={day.key} style={styles.column}>
              <Text
                style={[
                  styles.value,
                  day.count > 0 && styles.valueActive,
                ]}
              >
                {day.count || '·'}
              </Text>

              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: day.today
                        ? colors.primary
                        : '#67946C',
                      opacity: day.count ? 1 : 0,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.day,
                  day.today && styles.today,
                ]}
              >
                {day.label}
              </Text>

              {day.today && (
                <View style={styles.todayDot} />
              )}
            </View>
          );
        })}
      </View>

      {!hasActivity && (
        <Text style={styles.message}>
          No workouts logged this week yet.
          Your first session will appear here.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 172,
    paddingTop: 10,
  },
  column: {
    width: '13.2%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  value: {
    color: '#708477',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
  },
  valueActive: {
    color: colors.text,
  },
  track: {
    width: '72%',
    maxWidth: 36,
    minWidth: 18,
    height: 104,
    justifyContent: 'flex-end',
    backgroundColor: '#25392A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    borderRadius: 9,
    width: '100%',
  },
  day: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 9,
  },
  today: {
    color: colors.primary,
    fontWeight: '900',
  },
  todayDot: {
    backgroundColor: colors.primary,
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 5,
  },
  message: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 9,
  },
});
