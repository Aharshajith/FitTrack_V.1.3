# FitTrack

FitTrack is a mobile fitness tracker built with Expo and React Native for tracking workouts, managing exercise plans, and monitoring personal progress entirely on-device.

The app is designed for offline use and keeps workout data, profile details, and body metrics in a local SQLite database so users can train without relying on cloud services.

## Overview

FitTrack combines a dashboard, a workout planner, exercise library, session logging, progress insights, and profile management into a single mobile-first experience.

Key goals of the app:

- Track workout sessions and summarize recent activity
- Create and edit reusable workout plans
- Browse a local exercise catalog with difficulty, muscle group, and category filters
- Log training data including duration, sets, reps, and weight
- Review weekly and long-term progress without internet access
- Keep personal fitness information saved on the device

## App features

- Dashboard with greeting, goal summary, recent workouts, and weekly training activity
- Workout plans screen for creating and editing training routines
- Exercise library with searchable workout catalog and exercise details
- Workout logging flow for recording completed sessions
- Progress screen for weekly trends and training history
- Profile screen for user details, fitness goal, and body-weight tracking
- Local SQLite storage with seeded exercise data and no dependency on external APIs
- Dark/light themed UI with mobile-friendly navigation

## Tech stack

- Expo SDK 58
- React Native 0.88.1
- React Navigation
- Expo SQLite
- Expo Video
- React Native Safe Area Context

## Project structure

```text
FitTrack_V.1.3/
├── App.js
├── app.json
├── index.js
├── package.json
├── README.md
├── src/
│   ├── assets/
│   ├── components/
│   ├── database/
│   ├── navigation/
│   ├── screens/
│   ├── theme/
│   └── utils/
├── tests/
├── assets/
└── LICENSE
```

## Screens

### Home
The dashboard shows the user’s current training snapshot, including workout count, total minutes, saved goal, and recent sessions.

### Plans
Users can create and manage workout plans, customize exercises, and keep structured routines ready for training.

### Explore
The exercise library provides a searchable list of exercises with category, muscle group, and difficulty metadata. Each exercise includes a description and video reference support.

### Log
The workout log screen is used to record completed workouts and maintain session-level details.

### Progress
The progress area tracks activity trends, workout history, and body-weight history over time.

### Me
The profile screen stores personal details and fitness goals.

## Local data model

The app uses SQLite to persist:

- Exercise library data
- Workout plans
- Completed workout sessions
- Body progress entries
- User profile information

This means the app remains functional offline and stores user data on the device instead of a remote backend.

## Prerequisites

Before running the project, make sure you have:

- Node.js 18+ or newer
- npm
- Expo CLI via the project scripts
- An Android or iOS device for Expo Go, or a simulator/emulator

## Installation

From the project root, install dependencies:

```bash
npm install
```

Then start the app:

```bash
npx expo start --clear
```

For platform-specific launch:

```bash
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Running the app

1. Start Metro with Expo.
2. Scan the QR code in Expo Go on your mobile device.
3. If needed, use a development build or simulator for platform testing.

## Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run test:db
```

The database smoke test validates the app’s SQLite behavior and checks data integrity patterns used by the fitness tracker.

## Testing

To run the project smoke test:

```bash
npm run test:db
```

This checks the database’s expected setup and offline data handling basics; it is helpful for validation during development but should be paired with actual mobile testing.

## Notes

- The app is intended for mobile usage and makes use of device-local storage.
- Exercise data is pre-seeded and designed to work without an active network connection.
- The project is optimized for an Expo/React Native workflow and is best validated on a physical device or simulator.

## License

This project is distributed under the license included in the repository.
