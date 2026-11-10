const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

async function run() {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/utils/dashboardMetrics.js'),
    'utf8'
  );

  const url =
    `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

  const m = await import(url);

  assert.equal(
    m.parseSessionDate('2026-11-10 12:30:00').toISOString(),
    '2026-11-10T12:30:00.000Z'
  );

  assert.equal(
    m.parseSessionDate('2026-11-10T18:00:00+05:30').toISOString(),
    '2026-11-10T12:30:00.000Z'
  );

  assert.equal(
    m.parseSessionDate('2026-11-10 12:30:00.25')
      .getUTCMilliseconds(),
    250
  );

  const invalidInputs = [
    null,
    '',
    'bad',
    '2026-02-30',
    '2026-13-01',
    '2026-01-01 24:00:00',
  ];

  for (const input of invalidInputs) {
    assert.equal(
      m.parseSessionDate(input),
      null,
      String(input)
    );
  }

  assert.ok(m.parseSessionDate('2024-02-29'));

  assert.equal(
    m.parseSessionDate('2026-11-10').getHours(),
    0
  );

  assert.throws(
    () => m.weekBounds(new Date('bad')),
    /valid Date/
  );

  const now = new Date(2026, 10, 10, 12);
  const bounds = m.weekBounds(now);

  assert.equal(bounds.firstDay.getDay(), 1);
  assert.equal(bounds.firstDay.getHours(), 0);
  assert.equal(bounds.nextWeek.getDay(), 1);

  const before = new Date(
    bounds.firstDay.getTime() - 1000
  );

  const result = m.weeklyActivity([
    {
      date: bounds.firstDay.toISOString(),
      duration: 30,
    },
    {
      date: now.toISOString(),
      duration: '20',
    },
    {
      date: now.toISOString(),
      duration: Infinity,
    },
    {
      date: now.toISOString(),
      duration: -3,
    },
    {
      date: before.toISOString(),
      duration: 10,
    },
    {
      date: bounds.nextWeek.toISOString(),
      duration: 10,
    },
    null,
  ], now);

  assert.equal(result.days.length, 7);
  assert.equal(result.totalWorkouts, 4);
  assert.equal(result.totalMinutes, 50);
  assert.equal(result.activeDays, 2);

  assert.equal(
    result.days.filter((day) => day.today).length,
    1
  );

  assert.equal(
    m.weeklyActivity({}, now).totalWorkouts,
    0
  );

  assert.match(
    m.formatRecentDate(now.toISOString(), now),
    /^Today/
  );

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  assert.match(
    m.formatRecentDate(yesterday.toISOString(), now),
    /^Yesterday/
  );

  assert.match(
    m.formatRecentDate('2025-06-01', now),
    /2025/
  );

  assert.equal(m.greetingForHour(11), 'Good morning');
  assert.equal(m.greetingForHour(12), 'Good afternoon');
  assert.equal(m.greetingForHour(17), 'Good evening');
  assert.equal(m.greetingForHour(NaN), 'Hello');

  // A daylight-saving week can contain 167 hours.
  const spring = m.weekBounds(new Date(2026, 2, 8, 12));

  if (process.env.TZ === 'America/New_York') {
    assert.equal(
      (spring.nextWeek - spring.firstDay) / 3600000,
      167
    );
  }

  console.log(`PASS: metrics (${process.env.TZ})`);
}

if (process.argv.includes('--child')) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  const zones = [
    'UTC',
    'Asia/Colombo',
    'America/New_York',
  ];

  for (const zone of zones) {
    const result = spawnSync(
      process.execPath,
      [__filename, '--child'],
      {
        env: { ...process.env, TZ: zone },
        stdio: 'inherit',
        timeout: 15000,
      }
    );

    if (result.error) console.error(result.error);

    if (result.error || result.status !== 0) {
      process.exitCode = 1;
    }
  }
}