import * as SQLite from 'expo-sqlite';
import { exercises } from './seedData';

let databasePromise;
let initializationPromise;

export function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('fittrack.db').catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
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
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
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

  // Non-destructive upgrade of databases created by older FitTrack versions.
  const columns = await db.getAllAsync('PRAGMA table_info(workout_sessions)');
  if (!columns.some((column) => column.name === 'plan_name')) {
    await db.execAsync('ALTER TABLE workout_sessions ADD COLUMN plan_name TEXT');
  }

  // The old seed had INSERT OR IGNORE without a UNIQUE constraint, so app
  // restarts created duplicates. Repoint existing records before deduplication.
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(`
      UPDATE workout_sessions
      SET plan_name = (SELECT name FROM workout_plans WHERE id = workout_sessions.plan_id)
      WHERE plan_name IS NULL
    `);

    const existing = await txn.getAllAsync('SELECT id, name FROM exercises ORDER BY id');
    const firstIds = new Map();
    for (const exercise of existing) {
      const key = exercise.name.toLocaleLowerCase();
      if (!firstIds.has(key)) {
        firstIds.set(key, exercise.id);
      } else {
        const firstId = firstIds.get(key);
        await txn.runAsync('UPDATE plan_exercises SET exercise_id = ? WHERE exercise_id = ?', firstId, exercise.id);
        await txn.runAsync('UPDATE workout_records SET exercise_id = ? WHERE exercise_id = ?', firstId, exercise.id);
        await txn.runAsync('DELETE FROM exercises WHERE id = ?', exercise.id);
      }
    }

    await txn.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name COLLATE NOCASE)');

    for (const exercise of exercises) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO exercises
          (name, category, muscle_group, difficulty, description)
         VALUES (?, ?, ?, ?, ?)`,
        exercise.name, exercise.category, exercise.muscle_group,
        exercise.difficulty, exercise.description
      );
    }
  });
}
