# FitTrack — 16 offline 3D-style Movement Guides

## What is included

- 16 exercise-specific silent H.264 MP4 clips (640×360, 15 fps), bundled in `src/assets/exercise-videos`.
- Consistent photorealistic **3D-looking** human-character visual direction: lime-green sports shirt, black shorts, white trainers on a dark green stage.
- The clips are **AI-generated four-pose animations with interpolated/faded transitions**. They are not real motion capture, not rigged 3D animation, not actual human exercise footage, and are not biomechanically validated. Some between-pose transitions may look ghosted. Keep the written form descriptions visible and verify technique with a qualified trainer before instructional use.
- The 16 exercise names and SQLite records are untouched.
- The existing details popup retains Play/Pause, timeline scrubbing, elapsed and total time, Replay and Full screen. All playback is offline.

## Run

1. Extract the ZIP and open the root containing `package.json` in VS Code.
2. Use Node.js 22.13+ and working npm internet access to run `npm install`. npm registry ENOTFOUND means a DNS/network issue, not a code problem.
3. Run `npx expo start --clear` and open the compatible Expo Go app.
4. In Exercise Library, select any of the 16 exercises and check the looping guide. Test controls and fullscreen on an Android device before ICA submission.

## Tech and limitations

- Expo 58 with `expo-video` and bundled static `require()` MP4 paths.
- No API, no video streaming, no online DB, and no node_modules included.
- All 16 files were validated with ffprobe and source paths checked. Native Android playback was not device-tested in the authoring environment.
