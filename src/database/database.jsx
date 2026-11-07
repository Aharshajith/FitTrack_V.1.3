import * as SQLite from 'expo-sqlite';
import { exercises } from './seedData';

const DATABASE_NAME = 'fittrack.db';
const DATABASE_VERSION = 1;

let connectionPromise;
let initializationPromise;
let writeQueue = Promise.resolve();

function openReadConnection() {
  if (!connectionPromise) {
    connectionPromise = SQLite.openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await db.execAsync(`
          PRAGMA foreign_keys = ON;
          PRAGMA busy_timeout = 5000;
          PRAGMA journal_mode = WAL;
        `);

        return db;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}

export function withDatabaseTransaction(task) {
  const operation = writeQueue.then(async () => {
    const txn = await SQLite.openDatabaseAsync(DATABASE_NAME, {
      useNewConnection: true,
    });

    let transactionStarted = false;

    try {
      await txn.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
      `);

      await txn.execAsync('BEGIN IMMEDIATE');
      transactionStarted = true;

      const result = await task(txn);

      await txn.execAsync('COMMIT');
      transactionStarted = false;

      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await txn.execAsync('ROLLBACK');
        } catch (rollbackError) {
          console.error('Database rollback failed:', rollbackError);
        }
      }

      throw error;
    } finally {
      try {
        await txn.closeAsync();
      } catch (closeError) {
        // A successful commit should not appear to have failed
        // just because closing the connection failed.
        console.error('Database connection close failed:', closeError);
      }
    }
  });

  // A failed write must not prevent later writes.
  writeQueue = operation.catch(() => undefined);

  return operation;
}

export async function getDatabase() {
  const reader = await openReadConnection();

  return {
    getAllAsync: (...args) => reader.getAllAsync(...args),

    getFirstAsync: (...args) => reader.getFirstAsync(...args),

    runAsync: (...args) =>
      withDatabaseTransaction((txn) => txn.runAsync(...args)),

    execAsync: (sql) =>
      withDatabaseTransaction((txn) => txn.execAsync(sql)),

    withExclusiveTransactionAsync: (task) =>
      withDatabaseTransaction(task),
  };
}

export function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = setupDatabase().catch((error) => {
      initializationPromise = undefined;
      throw error;
    });
  }

  return initializationPromise;
}

async function setupDatabase() {
  await openReadConnection();

  await withDatabaseTransaction(async (txn) => {
    const versionRow = await txn.getFirstAsync('PRAGMA user_version');
    const currentVersion = Number(versionRow?.user_version ?? 0);

    if (currentVersion > DATABASE_VERSION) {
      throw new Error(
        'This database was created by a newer FitTrack version.'
      );
    }

    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        age INTEGER,
        height REAL,
        fitness_goal TEXT
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        muscle_group TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS workout_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plan_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        exercise_id INTEGER,
        sets INTEGER DEFAULT 3,
        reps INTEGER DEFAULT 12,
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        duration INTEGER DEFAULT 0,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        plan_name TEXT,
        FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
      );

      CREATE TABLE IF NOT EXISTS workout_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        exercise_id INTEGER,
        sets INTEGER,
        reps INTEGER,
        weight REAL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS body_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        weight REAL,
        recorded_date TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const sessionColumns = await txn.getAllAsync(
      'PRAGMA table_info(workout_sessions)'
    );

    if (!sessionColumns.some((column) => column.name === 'plan_name')) {
      await txn.execAsync(
        'ALTER TABLE workout_sessions ADD COLUMN plan_name TEXT'
      );
    }

    if (currentVersion < 1) {
      await migrateLegacyData(txn);
    }

    // Run on every launch so corrected descriptions and metadata
    // reach existing installations without changing exercise IDs.
    await syncExercises(txn);

    await createIndexes(txn);
    await createValidationTriggers(txn);

    if (currentVersion < DATABASE_VERSION) {
      await txn.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
    }
  });
}

async function migrateLegacyData(txn) {
  await txn.runAsync(`
    UPDATE workout_sessions
    SET plan_name = (
      SELECT name
      FROM workout_plans
      WHERE workout_plans.id = workout_sessions.plan_id
    )
    WHERE plan_name IS NULL
  `);

  const existing = await txn.getAllAsync(
    'SELECT id, name FROM exercises ORDER BY id'
  );

  const firstIds = new Map();

  for (const exercise of existing) {
    // SQLite NOCASE performs ASCII case folding.
    const key = exercise.name.replace(/[A-Z]/g, (letter) =>
      letter.toLowerCase()
    );

    if (!firstIds.has(key)) {
      firstIds.set(key, exercise.id);
      continue;
    }

    const retainedId = firstIds.get(key);

    await txn.runAsync(
      'UPDATE plan_exercises SET exercise_id = ? WHERE exercise_id = ?',
      retainedId,
      exercise.id
    );

    await txn.runAsync(
      'UPDATE workout_records SET exercise_id = ? WHERE exercise_id = ?',
      retainedId,
      exercise.id
    );

    await txn.runAsync(
      'DELETE FROM exercises WHERE id = ?',
      exercise.id
    );
  }
}

async function syncExercises(txn) {
  await txn.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_name
    ON exercises(name COLLATE NOCASE);
  `);

  for (const exercise of exercises) {
    await txn.runAsync(
      `
        INSERT INTO exercises (
          name,
          category,
          muscle_group,
          difficulty,
          description
        )
        VALUES (?, ?, ?, ?, ?)

        ON CONFLICT(name COLLATE NOCASE)
        DO UPDATE SET
          category = excluded.category,
          muscle_group = excluded.muscle_group,
          difficulty = excluded.difficulty,
          description = excluded.description
      `,
      exercise.name,
      exercise.category,
      exercise.muscle_group,
      exercise.difficulty,
      exercise.description
    );
  }
}

async function createIndexes(txn) {
  await txn.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan
    ON plan_exercises(plan_id);

    CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise
    ON plan_exercises(exercise_id);

    CREATE INDEX IF NOT EXISTS idx_workout_records_session
    ON workout_records(session_id);

    CREATE INDEX IF NOT EXISTS idx_workout_records_exercise
    ON workout_records(exercise_id);

    CREATE INDEX IF NOT EXISTS idx_workout_sessions_plan
    ON workout_sessions(plan_id);

    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date
    ON workout_sessions(date);
  `);
}

async function createValidationTriggers(txn) {
  /*
   * Validation triggers also work with existing tables.
   * No table rebuilding or deletion of saved user data is required.
   * UPDATE triggers validate only when numeric fields are changed.
   */
  const rules = [
    {
      table: 'plan_exercises',
      fields: 'sets, reps',
      invalid: `
        typeof(NEW.sets) != 'integer'
        OR NEW.sets NOT BETWEEN 1 AND 100
        OR typeof(NEW.reps) != 'integer'
        OR NEW.reps NOT BETWEEN 1 AND 1000
      `,
    },
    {
      table: 'workout_records',
      fields: 'sets, reps, weight',
      invalid: `
        typeof(NEW.sets) != 'integer'
        OR NEW.sets NOT BETWEEN 1 AND 100
        OR typeof(NEW.reps) != 'integer'
        OR NEW.reps NOT BETWEEN 1 AND 1000
        OR NEW.weight IS NULL
        OR typeof(NEW.weight) NOT IN ('integer', 'real')
        OR NEW.weight NOT BETWEEN 0 AND 1000
      `,
    },
    {
      table: 'workout_sessions',
      fields: 'duration',
      invalid: `
        typeof(NEW.duration) != 'integer'
        OR NEW.duration NOT BETWEEN 1 AND 1440
      `,
    },
    {
      table: 'body_progress',
      fields: 'weight',
      invalid: `
        NEW.weight IS NULL
        OR typeof(NEW.weight) NOT IN ('integer', 'real')
        OR NEW.weight <= 0
        OR NEW.weight > 500
      `,
    },
  ];

  for (const rule of rules) {
    for (const event of ['INSERT', 'UPDATE']) {
      const operation =
        event === 'UPDATE'
          ? `UPDATE OF ${rule.fields}`
          : 'INSERT';

      await txn.execAsync(`
        CREATE TRIGGER IF NOT EXISTS validate_${rule.table}_${event}
        BEFORE ${operation} ON ${rule.table}
        WHEN ${rule.invalid}
        BEGIN
          SELECT RAISE(ABORT, 'Invalid ${rule.table} values');
        END;
      `);
    }
  }
}