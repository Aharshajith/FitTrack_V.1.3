const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '..');

const read = (file) =>
  fs.readFileSync(path.join(root, file), 'utf8');

async function scenario(legacy) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'fittrack-test-')
  );

  const file = path.join(directory, 'test.db');
  const opened = new Set();

  function connect() {
    const raw = new DatabaseSync(file);

    // Do not accidentally rely on Node enabling foreign keys.
    // The application must enable them on its own connections.
    raw.exec('PRAGMA foreign_keys = OFF;');
    opened.add(raw);

    return {
      execAsync: async (sql) => raw.exec(sql),

      getAllAsync: async (sql, ...params) =>
        raw.prepare(sql).all(...params),

      getFirstAsync: async (sql, ...params) =>
        raw.prepare(sql).get(...params) ?? null,

      runAsync: async (sql, ...params) => {
        const result = raw.prepare(sql).run(...params);

        return {
          changes: Number(result.changes),
          lastInsertRowId: Number(result.lastInsertRowid),
        };
      },

      closeAsync: async () => {
        raw.close();
        opened.delete(raw);
      },
    };
  }

  try {
    const reader = connect();

    const seedSource = read('src/database/seedData.js');
    const seedURL =
      `data:text/javascript;base64,${Buffer.from(seedSource).toString('base64')}`;

    const seedModule = await import(seedURL);

    // Test changes must not mutate the imported seed module.
    const exercises = seedModule.exercises.map(
      (item) => ({ ...item })
    );

    const source = read('src/database/database.js')
      .replace(/^import\s[\s\S]*?;\s*/gm, '')
      .replace(
        /\bexport\s+(?=(?:async\s+)?function\b|const\b|let\b)/g,
        ''
      );

    function moduleInstance() {
      const context = {
        console,
        exercises,
        SQLite: {
          openDatabaseAsync: async (_name, options) =>
            options?.useNewConnection ? connect() : reader,
        },
      };

      vm.runInNewContext(
        source +
          '\nthis.api = {' +
          ' initializeDatabase, getDatabase, withDatabaseTransaction' +
          ' };',
        context
      );

      return context.api;
    }

    if (legacy) {
      // Fixed legacy schema: intentionally has no plan_name column
      // and contains duplicate exercise rows.
      await reader.execAsync(`
        CREATE TABLE exercises (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          muscle_group TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          description TEXT
        );

        CREATE TABLE workout_plans (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE plan_exercises (
          id INTEGER PRIMARY KEY,
          plan_id INTEGER,
          exercise_id INTEGER,
          sets INTEGER DEFAULT 3,
          reps INTEGER DEFAULT 12,
          FOREIGN KEY(plan_id) REFERENCES workout_plans(id),
          FOREIGN KEY(exercise_id) REFERENCES exercises(id)
        );

        CREATE TABLE workout_sessions (
          id INTEGER PRIMARY KEY,
          plan_id INTEGER,
          duration INTEGER DEFAULT 0,
          date TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(plan_id) REFERENCES workout_plans(id)
        );

        CREATE TABLE workout_records (
          id INTEGER PRIMARY KEY,
          session_id INTEGER,
          exercise_id INTEGER,
          sets INTEGER,
          reps INTEGER,
          weight REAL DEFAULT 0,
          FOREIGN KEY(session_id) REFERENCES workout_sessions(id),
          FOREIGN KEY(exercise_id) REFERENCES exercises(id)
        );

        INSERT INTO exercises
        VALUES(1,'Push Ups','Strength','Chest','Beginner','old');

        INSERT INTO exercises
        VALUES(2,'Push Ups','Strength','Chest','Beginner','duplicate');

        INSERT INTO workout_plans(id,name)
        VALUES(1,'Old plan');

        INSERT INTO plan_exercises
        VALUES(1,1,2,3,12);

        INSERT INTO workout_sessions(id,plan_id,duration)
        VALUES(1,1,25);

        INSERT INTO workout_records
        VALUES(1,1,2,3,12,0);
      `);
    }

    let api = moduleInstance();

    await Promise.all([
      api.initializeDatabase(),
      api.initializeDatabase(),
    ]);

    const count = async (table) =>
      (
        await reader.getFirstAsync(
          `SELECT COUNT(*) AS n FROM ${table}`
        )
      ).n;

    assert.equal(
      await count('exercises'),
      exercises.length,
      'All seed exercises should exist'
    );

    if (legacy) {
      const planExercise = await reader.getFirstAsync(
        'SELECT exercise_id FROM plan_exercises WHERE id=1'
      );

      const record = await reader.getFirstAsync(
        'SELECT exercise_id FROM workout_records WHERE id=1'
      );

      const session = await reader.getFirstAsync(
        'SELECT plan_name FROM workout_sessions WHERE id=1'
      );

      assert.equal(planExercise.exercise_id, 1);
      assert.equal(record.exercise_id, 1);
      assert.equal(session.plan_name, 'Old plan');
    }

    // Changing seed metadata should preserve the existing ID.
    const seed = exercises[0];

    const original = await reader.getFirstAsync(
      'SELECT id FROM exercises WHERE name=?',
      seed.name
    );

    seed.description = 'Updated test description';

    api = moduleInstance();
    await api.initializeDatabase();

    const updated = await reader.getFirstAsync(
      'SELECT id, description FROM exercises WHERE name=?',
      seed.name
    );

    assert.equal(updated.id, original.id);
    assert.equal(updated.description, seed.description);
    assert.equal(await count('exercises'), exercises.length);

    const db = await api.getDatabase();
    const before = await count('workout_plans');

    // A foreign-key failure should roll back the entire transaction.
    await assert.rejects(
      () => api.withDatabaseTransaction(async (txn) => {
        await txn.runAsync(
          "INSERT INTO workout_plans(name) VALUES('Rollback me')"
        );

        await txn.runAsync(
          `INSERT INTO plan_exercises
             (plan_id, exercise_id, sets, reps)
           VALUES(99999, ?, 3, 12)`,
          original.id
        );
      }),
      /FOREIGN KEY/i
    );

    assert.equal(await count('workout_plans'), before);

    await assert.rejects(
      () => db.runAsync(
        'INSERT INTO body_progress(weight) VALUES(-1)'
      ),
      /Invalid body_progress/
    );

    await assert.rejects(
      () => db.runAsync(
        'INSERT INTO workout_sessions(duration) VALUES(0)'
      ),
      /Invalid workout_sessions/
    );

    // Existing screen calls must also use protected transactions.
    await db.withExclusiveTransactionAsync(async (txn) => {
      const setting = await txn.getFirstAsync(
        'PRAGMA foreign_keys'
      );

      assert.equal(setting.foreign_keys, 1);

      await txn.runAsync(
        "INSERT INTO workout_plans(name) VALUES('Isolated')"
      );

      // Another connection must not see an uncommitted write.
      assert.equal(await count('workout_plans'), before);
    });

    assert.equal(await count('workout_plans'), before + 1);

    // Failed writes above must not leave the write queue blocked.
    const measurements = await count('body_progress');

    await Promise.all(
      [60, 61, 62].map((weight) =>
        db.runAsync(
          'INSERT INTO body_progress(weight) VALUES(?)',
          weight
        )
      )
    );

    assert.equal(
      await count('body_progress'),
      measurements + 3
    );

    if (legacy) {
      await api.withDatabaseTransaction(async (txn) => {
        await txn.runAsync(
          'UPDATE workout_sessions SET plan_id=NULL WHERE plan_id=1'
        );
        await txn.runAsync(
          'DELETE FROM plan_exercises WHERE plan_id=1'
        );
        await txn.runAsync(
          'DELETE FROM workout_plans WHERE id=1'
        );
      });

      const preserved = await reader.getFirstAsync(
        'SELECT plan_name FROM workout_sessions WHERE id=1'
      );

      assert.equal(preserved.plan_name, 'Old plan');
      assert.equal(await count('workout_records'), 1);
    }

    const brokenReferences = await reader.getAllAsync(
      'PRAGMA foreign_key_check'
    );

    assert.equal(brokenReferences.length, 0);

    console.log(
      `PASS: database (${legacy ? 'legacy upgrade' : 'fresh install'})`
    );
  } finally {
    // Important on Windows: close connections before removing files.
    for (const raw of opened) raw.close();

    fs.rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
}

(async () => {
  await scenario(false);
  await scenario(true);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});