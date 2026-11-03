// Dependency-free database smoke test using Node 22's built-in SQLite.
// It executes the actual initialization code with an Expo-SQLite-compatible
// adapter, NOT a React Native / device integration test.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert').strict;
const { DatabaseSync } = require('node:sqlite');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/database/database.js'), 'utf8');
const seedText = fs.readFileSync(path.join(root, 'src/database/seedData.js'), 'utf8')
  .replace('export const exercises =', 'const exercises =');
const dataContext = {};
vm.runInNewContext(seedText + '\nthis.data = exercises;', dataContext);
const exercises = dataContext.data;
const sqlite = new DatabaseSync(':memory:');
const db = {
  execAsync: async (sql) => sqlite.exec(sql),
  runAsync: async (sql, ...params) => {
    const result = sqlite.prepare(sql).run(...params);
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  },
  getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params) ?? null,
  getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
  withExclusiveTransactionAsync: async (task) => {
    sqlite.exec('BEGIN IMMEDIATE');
    try { await task(db); sqlite.exec('COMMIT'); }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  },
};
function moduleInstance() {
  const script = source
    .replace("import * as SQLite from 'expo-sqlite';", '')
    .replace("import { exercises } from './seedData';", '')
    .replaceAll('export function ', 'function ')
    + '\nthis.api = { initializeDatabase, getDatabase };';
  const ctx = { SQLite: { openDatabaseAsync: async () => db }, exercises, Map, console };
  vm.runInNewContext(script, ctx);
  return ctx.api;
}

(async () => {
  // Reproduce the original database's repeated seed bug, preserving old IDs.
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, muscle_group TEXT NOT NULL, difficulty TEXT NOT NULL, description TEXT);
    CREATE TABLE workout_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE plan_exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER, exercise_id INTEGER, sets INTEGER DEFAULT 3, reps INTEGER DEFAULT 12, FOREIGN KEY (plan_id) REFERENCES workout_plans(id), FOREIGN KEY (exercise_id) REFERENCES exercises(id));
    CREATE TABLE workout_sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER, duration INTEGER DEFAULT 0, date TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (plan_id) REFERENCES workout_plans(id));
    CREATE TABLE workout_records (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, exercise_id INTEGER, sets INTEGER, reps INTEGER, weight REAL DEFAULT 0, FOREIGN KEY (session_id) REFERENCES workout_sessions(id), FOREIGN KEY (exercise_id) REFERENCES exercises(id));
  `);
  await db.runAsync("INSERT INTO exercises (name, category, muscle_group, difficulty) VALUES ('Push Ups', 'Strength', 'Chest', 'Beginner')");
  await db.runAsync("INSERT INTO exercises (name, category, muscle_group, difficulty) VALUES ('Push Ups', 'Strength', 'Chest', 'Beginner')");
  await db.runAsync("INSERT INTO workout_plans (name) VALUES ('Old plan')");
  await db.runAsync('INSERT INTO plan_exercises (plan_id, exercise_id) VALUES (1, 2)');
  await db.runAsync('INSERT INTO workout_sessions (plan_id, duration) VALUES (1, 25)');
  await db.runAsync('INSERT INTO workout_records (session_id, exercise_id, sets, reps) VALUES (1, 2, 3, 12)');

  await moduleInstance().initializeDatabase();
  assert.equal((await db.getFirstAsync("SELECT COUNT(*) AS n FROM exercises WHERE name='Push Ups'")).n, 1, 'Duplicate exercises must be removed');
  assert.equal((await db.getFirstAsync('SELECT exercise_id AS id FROM workout_records WHERE id=1')).id, 1, 'History must point to retained exercise ID');
  assert.equal((await db.getFirstAsync('SELECT exercise_id AS id FROM plan_exercises WHERE id=1')).id, 1, 'Plans must point to retained exercise ID');
  assert.equal((await db.getFirstAsync('SELECT plan_name AS n FROM workout_sessions WHERE id=1')).n, 'Old plan', 'Legacy session names should be migrated');
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM exercises')).n, exercises.length, 'Curated local dataset must be seeded');
  await moduleInstance().initializeDatabase();
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM exercises')).n, exercises.length, 'Restart must not duplicate exercises');
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('UPDATE workout_sessions SET plan_name = COALESCE(plan_name, ?) WHERE plan_id = ?', 'Old plan', 1);
    await txn.runAsync('UPDATE workout_sessions SET plan_id = NULL WHERE plan_id = ?', 1);
    await txn.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', 1);
    await txn.runAsync('DELETE FROM workout_plans WHERE id = ?', 1);
  });
  const session = await db.getFirstAsync('SELECT plan_name, plan_id FROM workout_sessions WHERE id=1');
  assert.equal(session.plan_name, 'Old plan');
  assert.equal(session.plan_id, null);
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM workout_records')).n, 1);
  assert.equal((await db.getFirstAsync('PRAGMA foreign_key_check')) ?? null, null, 'No broken foreign-key references');

  // Confirm a transaction rolls back if a record insert fails.
  const before = (await db.getFirstAsync('SELECT COUNT(*) AS n FROM workout_plans')).n;
  await assert.rejects(() => db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("INSERT INTO workout_plans (name) VALUES ('Temporary')");
    await txn.runAsync("INSERT INTO plan_exercises (plan_id, exercise_id) VALUES (99999, 1)");
  }));
  assert.equal((await db.getFirstAsync('SELECT COUNT(*) AS n FROM workout_plans')).n, before);
  console.log('PASS: legacy migration, unique local seeding, history preservation, foreign keys, transaction rollback.');
  sqlite.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
