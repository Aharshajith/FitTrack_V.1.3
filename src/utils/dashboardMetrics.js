export const WEEKDAYS = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun',
];

function validDate(value) {
  return value instanceof Date &&
    Number.isFinite(value.getTime());
}

function requireDate(value) {
  if (!validDate(value)) {
    throw new TypeError('Expected a valid Date.');
  }

  return value;
}

function localKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/*
 * SQLite timestamps and ISO timestamps without an offset use UTC.
 * Date-only strings represent local calendar dates.
 * Unsupported formats and impossible dates return null.
 */
export function parseSessionDate(value) {
  if (typeof value !== 'string') return null;

  const match = value.trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})?)?$/
  );

  if (!match) return null;

  const [, y, mo, d, h, mi, s, fraction, zone] = match;

  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h || 0);
  const minute = Number(mi || 0);
  const second = Number(s || 0);
  const millis = Number((fraction || '').padEnd(3, '0'));

  const check = new Date(0);
  check.setUTCFullYear(year, month - 1, day);
  check.setUTCHours(hour, minute, second, millis);

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  if (h === undefined) {
    const local = new Date(0);
    local.setFullYear(year, month - 1, day);
    local.setHours(0, 0, 0, 0);

    return local;
  }

  if (!zone || zone === 'Z') return check;

  const offsetHours = Number(zone.slice(1, 3));
  const offsetMinutes = Number(zone.slice(4, 6));

  if (offsetHours > 23 || offsetMinutes > 59) {
    return null;
  }

  const direction = zone[0] === '+' ? 1 : -1;
  const offset = (offsetHours * 60 + offsetMinutes) * direction;

  return new Date(check.getTime() - offset * 60000);
}

export function weekBounds(now = new Date()) {
  requireDate(now);

  const firstDay = new Date(now);
  firstDay.setHours(0, 0, 0, 0);

  const mondayOffset = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - mondayOffset);

  const nextWeek = new Date(firstDay);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const toSQL = (date) =>
    date.toISOString().slice(0, 19).replace('T', ' ');

  return {
    firstDay,
    nextWeek,
    fromUTC: toSQL(firstDay),
    untilUTC: toSQL(nextWeek),
  };
}

export function weeklyActivity(rows, now = new Date()) {
  const { firstDay } = weekBounds(now);
  const todayKey = localKey(now);

  const days = WEEKDAYS.map((label, index) => {
    const date = new Date(firstDay);
    date.setDate(date.getDate() + index);

    const key = localKey(date);

    return {
      label,
      key,
      count: 0,
      minutes: 0,
      today: key === todayKey,
    };
  });

  const byKey = new Map(days.map((day) => [day.key, day]));

  for (const row of Array.isArray(rows) ? rows : []) {
    const date = parseSessionDate(row?.date);
    if (!date) continue;

    const day = byKey.get(localKey(date));
    if (!day) continue;

    day.count += 1;

    const minutes = Number(row.duration);

    // Count the session, but ignore an invalid duration.
    if (
      Number.isFinite(minutes) &&
      minutes >= 0 &&
      minutes <= 1440
    ) {
      day.minutes += minutes;
    }
  }

  return {
    days,
    activeDays: days.filter((day) => day.count > 0).length,
    totalWorkouts: days.reduce(
      (sum, day) => sum + day.count,
      0
    ),
    totalMinutes: days.reduce(
      (sum, day) => sum + day.minutes,
      0
    ),
  };
}

export function greetingForHour(hour) {
  if (
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return 'Hello';
  }

  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';

  return 'Good evening';
}

export function formatRecentDate(value, now = new Date()) {
  const date = parseSessionDate(value);

  if (!date || !validDate(now)) return 'Saved session';

  // Compare calendar days, including daylight-saving transitions.
  const ordinal = (input) => {
    const utc = new Date(0);

    utc.setUTCFullYear(
      input.getFullYear(),
      input.getMonth(),
      input.getDate()
    );
    utc.setUTCHours(0, 0, 0, 0);

    return utc.getTime() / 86400000;
  };

  const difference = ordinal(now) - ordinal(date);

  const label =
    difference === 0
      ? 'Today'
      : difference === 1
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(date.getFullYear() !== now.getFullYear()
              ? { year: 'numeric' }
              : {}),
          });

  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${label} · ${time}`;
}