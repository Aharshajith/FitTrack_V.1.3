# FitTrack: consistent 3D character video production brief

These are **prompts and direction notes**, NOT generated videos. They are supplied to help replace the fifteen legacy illustrated clips with coherent realistic 3D MP4s. Verify exercises and suitability with a qualified trainer before publishing them as instructional material.

## Same character in every clip (paste before the exercise-specific prompt)

> Create a silent, loopable 4–6 second **realistic 3D-rendered fitness demonstration**. One consistent adult athletic male digital human in all clips: realistic anatomy, natural face, short dark hair, lime green fitted fitness T-shirt, black training shorts, white athletic sneakers. Studio-quality PBR materials, soft realistic skin, cloth folds, stable identity, hair and body proportions. Deep forest-green studio and floor, subtle neon-lime rim lighting matching FitTrack, no text, no logos, no animated graphics, no flat/vector/cartoon/stick figures. Keep a stable locked camera, enough framing for the entire body and equipment, clear floor contacts, no missing or extra limbs, realistic gravity, correct joint bending. Show one controlled repeat: start position, movement, peak/end position and return. Use the same character and render settings for all sixteen files. 16:9 aspect ratio, H.264 MP4, ideally 720p, 24–30 fps, muted/no sound.

## Exercise-specific motion and camera directions

| Exercise (asset filename) | Director notes |
|---|---|
| Push Ups (`push-ups.mp4`) | Side three-quarter view; high plank, lower chest toward floor keeping straight torso, push back to high plank. Hands planted and elbows bend naturally. |
| Bench Press (`bench-press.mp4`) | Three-quarter side angle; lying on a stable gym bench, barbell at chest level, press upward above chest and lower with control. Realistic bar grip and rack-free motion. |
| Squats (`squats.mp4`) | Three-quarter front view; stand feet about shoulder-width, sit hips back and bend knees to squat, return to standing. Keep shoes firmly planted. |
| Pull Ups (`pull-ups.mp4`) | Front three-quarter view; hang from fixed horizontal bar with full visible body; pull until chin approaches bar, lower under control. Hands remain on bar. |
| Plank (`plank.mp4`) | Side view; settle into a forearm plank with shoulders, hips and ankles in alignment; hold briefly and breathe, slight natural body movement rather than bending the spine. |
| Lunges (`lunges.mp4`) | Three-quarter side view; step forward and lower knees, return to standing; balanced legs and stable feet. |
| Bicep Curls (`bicep-curls.mp4`) | Front three-quarter view; hold one dumbbell per hand, flex both elbows to raise weights, then lower while keeping upper arms close to torso. |
| Jumping Jacks (`jumping-jacks.mp4`) | Full frontal view; jump feet apart while arms rise overhead, return feet together arms down. Proper full-body coordination. |
| Glute Bridges (`glute-bridges.mp4`) | Side view; lie on back knees bent feet planted; lift hips toward line from shoulders to knees, lower under control. |
| Mountain Climbers (`mountain-climbers.mp4`) | Side three-quarter view; high plank with planted hands; alternately draw knees toward chest; maintain stable shoulders. |
| Bicycle Crunches (`bicycle-crunches.mp4`) | Three-quarter elevated side view; lie supine, bring opposite elbow toward bent knee and alternate; gentle neck posture and controlled rotation. |
| Calf Raises (`calf-raises.mp4`) | Three-quarter rear view; standing, rise onto balls of feet with straight knees, pause, lower heels; show full ankles and feet. |
| High Knees (`high-knees.mp4`) | Front three-quarter view; jog gently on spot, alternately lift knees to hip height, natural synchronized arm swing. |
| Dumbbell Rows (`dumbbell-rows.mp4`) | Side three-quarter view; one hand/knee supported on gym bench, row free-hand dumbbell toward hip then lower; stable torso. |
| Side Plank (`side-plank.mp4`) | Side view; support on one forearm and sides of feet, hips lifted in a straight line, hold and return. |
| Brisk Walking (`brisk-walking.mp4`) | Three-quarter side view; one continuous brisk walking cycle across a static treadmill-like spot, alternating stride and arm swing, level shoulders. |

## Production and integration checklist

1. Generate and **review all 16 clips individually**. AI motion often introduces foot sliding, wrong hand positions or extra fingers. Fix those issues before use.
2. Export each as H.264 `.mp4`, no audio required, 16:9. Keep clips short to reduce offline app size.
3. Copy each using exactly the filenames above to `src/assets/exercise-videos/`.
4. Set `mediaType="3d-look"` or adjust the note in `src/screens/ExerciseLibraryScreen.js` for clips that have been replaced and checked. This is presentational metadata only.
5. Run `npx expo start --clear` and test video controls on a real Android phone as well as the phone's offline mode.
6. Keep purchase/license records or creation provenance for every imported video.
