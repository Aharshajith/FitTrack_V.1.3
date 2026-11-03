# FitTrack — Offline Fitness and Workout Tracker

An individual React Native + Expo project created for **ICA 03**. FitTrack lets users create workout plans, explore exercises, record sessions, monitor progress, and manage their personal fitness profile without an internet connection.

## Features

- **6 connected screens:** Home, Plans, Explore, Log, Progress and Me.
- **Locally seeded exercise dataset:** 16 curated exercises categorized by training style and difficulty; seeded in SQLite on first launch without duplicate entries on later launches.
- **Search and filters:** Search exercise names, muscle groups and difficulty; filter by Strength / Cardio / Core.
- **Detailed exercise information:** Accessible from the Explore screen in a details sheet.
- **Editable workout plans:** Choose exercises, customize sets and reps, edit or delete plans.
- **Offline workout log:** Record duration, sets, reps and weight; view individual session details and totals.
- **Progress tracking:** Workout count, minutes, training volume, average duration and body-weight trends.
- **Profile management:** Save your details and fitness goal on the device with input validation.
- **History protection:** Deleting a workout plan will **not** delete completed workout history.

## Requirements

- Node.js **22.13 or newer** (Expo SDK 58)
- npm
- Expo Go on a compatible Android/iOS device, or an Expo-compatible simulator

## Setup on Windows

1. Extract `FitTrack_Improved.zip` to a folder.
2. Open the `FitTrack` folder in VS Code.
3. Open a terminal in that folder.
4. Run:

```bash
npm ci
npx expo start --clear
```

5. Scan the QR code with Expo Go (phone and laptop normally on the same Wi-Fi). If QR access is blocked, try `npx expo start --tunnel` (network needed for development only).
6. After the app launches, enable airplane mode to confirm offline behavior. The app's saved local data does not depend on any web service.

**Note:** `node_modules`, `.expo` and `.git` are intentionally excluded from the submitted ZIP. `npm ci` restores dependencies from `package-lock.json`. Do not commit `node_modules` to GitHub.

## Local storage

The app uses `expo-sqlite` (`fittrack.db`). The dataset is automatically created on first run. Profile, plans, session history and weight records are saved locally and persist when the app is closed and reopened. Uninstalling the app or clearing app data can remove local records; there is no cloud backup.

## Testing

On Node 22+, run the dependency-free SQLite smoke test:

```bash
npm run test:db
```

The smoke test checks seed deduplication, migration of older databases, foreign keys, workout-history preservation and rollback of failed transactions. **It does not replace device testing.**

### Manual test checklist (complete on an actual device)

- [ ] First launch: no database error; Explore contains 16 different exercises.
- [ ] Close and reopen: exercise count stays the same.
- [ ] Search/filter exercises and open/close the detail sheet.
- [ ] Create a plan with 2 exercises and custom sets/reps.
- [ ] Edit that plan and verify the changes in the Log screen.
- [ ] Start from the plan card; workout Log opens with the chosen plan.
- [ ] Save a workout and verify it appears in Home, Log and Progress.
- [ ] Open a workout's detailed history and check recorded values.
- [ ] Delete the plan; past workout and its records remain in Log.
- [ ] Save two body-weight measurements and inspect the history chart.
- [ ] Save your profile, close the app and verify values persist.
- [ ] Try invalid durations, empty plan names and invalid age/email inputs.
- [ ] Turn off internet and repeat reading/writing local data.
- [ ] Check small-screen navigation, long lists, keyboard and scrolling.

## ICA 03 requirements map

| ICA requirement | FitTrack implementation |
| --- | --- |
| Individual React Native project | Expo / React Native source |
| Unique project title | **Confirm FitTrack is not already registered** in the title spreadsheet |
| At least 5 screens | 6 screens |
| Navigation | React Navigation bottom tabs, cross-screen actions |
| Own local dataset | 16 bundled exercise entries stored in SQLite |
| Dynamic locally stored data | SQL queries used in all six screens |
| Search, filtering, detailed views | Explore library + workout history details |
| Offline support, no public APIs | Device-local SQLite only |
| GitHub history | Student should create and push regular personal commits |

**Assignment dates:** Register a unique title by **4 November 2026**. Project deadline **15 November 2026**.

## Important notes

- Do not upgrade dependencies blindly. This code is configured for **Expo SDK 58**.
- Expo SQLite's `withExclusiveTransactionAsync` is supported on mobile platforms but not web. The assignment targets a mobile app, so testing on Android/iOS is recommended.
- The new code was syntax-checked and the SQL flow was smoke-tested in isolation, but Expo Go / a real phone was not available in the review environment.


