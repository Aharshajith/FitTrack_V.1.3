
// Date helpers for the FitTrack Dashboard.
// SQLite CURRENT_TIMESTAMP is UTC, while the chart
// displays dates using the phone's local calendar.

export const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

export function parseSessionDate(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  const utcTimestamp =
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)
      ? normalized.replace(' ', 'T') + 'Z'
      : normalized;

  const date = new Date(utcTimestamp);

  return Number.isFinite(date.getTime())
    ? date
    : null;
}

export function weekBounds(now = new Date()) {
  const weekdayMondayFirst = (now.getDay() + 6) % 7;

  const firstDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - weekdayMondayFirst
  );

  const nextWeek = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    firstDay.getDate() + 7
  );

  const toSQLite = (date) =>
    date.toISOString().slice(0, 19).replace('T', ' ');

  return {
    firstDay,
    nextWeek,
    fromUTC: toSQLite(firstDay),
    untilUTC: toSQLite(nextWeek),
  };
}

export function weeklyActivity(rows, now = new Date()) {
  const { firstDay } = weekBounds(now);

  const days = WEEKDAYS.map((label, index) => {
    const date = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      firstDay.getDate() + index
    );

    return {
      label,
      key: `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`,
      count: 0,
      minutes: 0,
      today: date.toDateString() === now.toDateString(),
    };
  });

  const map = new Map(
    days.map((day) => [day.key, day])
  );

  for (const row of rows || []) {
    const date = parseSessionDate(row.date);
    if (!date) continue;

    const key = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;

    const day = map.get(key);

    if (day) {
      day.count += 1;
      day.minutes += Math.max(
        0,
        Number(row.duration) || 0
      );
    }
  }

  return {
    days,
    activeDays: days.filter(
      (day) => day.count > 0
    ).length,
    totalWorkouts: days.reduce(
      (total, day) => total + day.count,
      0
    ),
    totalMinutes: days.reduce(
      (total, day) => total + day.minutes,
      0
    ),
  };
}

export function greetingForHour(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatRecentDate(
  value,
  now = new Date()
) {
  const date = parseSessionDate(value);

  if (!date) return 'Saved session';

  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const sessionMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const difference = Math.round(
    (midnight - sessionMidnight) / 86400000
  );

  const day =
    difference === 0
      ? 'Today'
      : difference === 1
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

  return `${day} · ${date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}
