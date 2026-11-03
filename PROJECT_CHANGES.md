# FitTrack improvement summary

## Problems addressed

1. **Exercise duplication on startup:** Original SQLite schema had no unique constraint on exercise names, so `INSERT OR IGNORE` did not prevent duplicates. Existing duplicates are now consolidated, foreign-key references are preserved, a unique index is added and the local dataset is seeded exactly once.
2. **Plan deletion failure:** Original deletion did not detach existing `workout_sessions`; foreign keys could block deletion. Sessions are now detached while keeping their names and recorded exercises.
3. **Partial plan/session saves:** Related inserts now run in exclusive database transactions so an error rolls the operation back.
4. **Stale screen information:** Data is reloaded when returning to its navigation tab.
5. **Exercise details off-screen:** Replaced the end-of-list details area with a modal detail sheet.
6. **Input validation:** Added reasonable age, height, email, sets, reps, weight and duration constraints. Repeated taps are guarded on important save operations.

## New or improved UX

- Consistent responsive dark theme with a lime-green accent, reusable cards and buttons.
- Reworked 6-tab navigation with keyboard-aware visibility and safe-area handling.
- Improved Home summary with sessions completed during the last 7 days.
- Direct 'Start' action from a workout plan to a preselected logging form.
- Full plan editing including exercise selection, sets and reps.
- Exercise search includes name, muscle group and difficulty; category chips.
- Workout history details sheet, including recorded exercise sets, reps and weight.
- Clear empty states and better contextual labels.
- Body-weight history shows the latest recorded measurement and trend.

## Verification performed

- **Passed:** Static syntax parsing of all React Native JavaScript/JSX files.
- **Passed:** Node built-in SQLite smoke test for migration, seeding, key integrity, old history and rollback.
- **Not verified:** Physical Android/iOS UI or Expo runtime. Dependencies were not fully installed in the review environment. Run the device test checklist in README before submitting your ICA.


## 2026-11-03 — 16 realistic 3D-looking movement guides

- Replaced all 16 exercise MP4s with four-pose AI-generated 3D-style human loops (offline 640x360 H.264, 15 FPS, 3.2 seconds).
- Preserved the existing SQLite records, six screens, and reusable player controls.
- Updated labels/notes so clips are not represented as authentic rigged 3D or validated movement tutorials.
- Verified all 16 codec/duration/source path entries and reran database smoke tests. Native device playback not verified.
