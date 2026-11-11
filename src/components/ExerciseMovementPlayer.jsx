import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStyles } from '../theme/ThemeProvider';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

// The media source is an offline static require() result, not an API URL.
// This component is mounted once for the selected exercise, then unmounted on modal close.
export default function ExerciseMovementPlayer({ source, exerciseName, mediaType = 'illustrated' }) {
  const { colors, styles, shared } = useThemeStyles(createStyles);
  const videoRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.timeUpdateEventInterval = 0.15;
    instance.play();
  });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: player.currentTime });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const duration = Number.isFinite(player.duration) && player.duration > 0 ? player.duration : 0;
  const progress = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
  const seekToTouch = (event) => {
    if (!duration || !trackWidth) return;
    const position = event.nativeEvent.locationX;
    if (!Number.isFinite(position)) return;
    player.currentTime = Math.min(duration - 0.01, Math.max(0, (position / trackWidth) * duration));
  };
  const replay = () => {
    player.currentTime = 0;
    player.play();
  };
  const fullscreen = async () => {
    try {
      await videoRef.current?.enterFullscreen();
    } catch (error) {
      console.warn('Fullscreen unavailable on this device:', error);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Movement Guide</Text>
          <Text style={styles.subtitle}>Start · Perform · Return — repeat</Text>
        </View>
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline-outline" color={colors.primary} size={14} />
          <Text style={styles.offlineText}>OFFLINE</Text>
        </View>
      </View>

      <View style={styles.frame}>
        <VideoView
          ref={videoRef}
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture={false}
          surfaceType="textureView"
        />
        {status === 'error' && (
          <View style={styles.messageOverlay}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.error}>This video could not be loaded.</Text>
          </View>
        )}
      </View>

      <View style={styles.progressRow}>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={`${exerciseName} video progress`}
          accessibilityHint="Tap along this bar to seek to a different moment"
          style={styles.trackTouch}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onPress={seekToTouch}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.dot, { left: `${progress * 100}%` }]} />
          </View>
        </Pressable>
        <Text style={styles.time}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.control, styles.primaryControl]}
          onPress={() => (isPlaying ? player.pause() : player.play())}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? `Pause ${exerciseName}` : `Play ${exerciseName}`}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={17} color={colors.primaryDark} />
          <Text style={styles.primaryControlText}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </Pressable>
        <Pressable 
          style={styles.control} 
          onPress={replay} 
          accessibilityRole="button" 
          accessibilityLabel={`Replay ${exerciseName}`}
        >
          <Ionicons name="refresh-outline" color={colors.text} size={17} />
          <Text style={styles.controlText}>Replay</Text>
        </Pressable>
        <Pressable 
          style={styles.control} 
          onPress={fullscreen} 
          accessibilityRole="button" 
          accessibilityLabel={`Fullscreen ${exerciseName} video`}
        >
          <Ionicons name="expand-outline" color={colors.text} size={17} />
          <Text style={styles.controlText}>Full screen</Text>
        </Pressable>
      </View>
      <Text style={styles.note}>
        {'AI-generated 3D-style pose transitions, not a motion-captured 3D workout. Check the written form guidance below.'}
      </Text>
    </View>
  );
}

const createStyles = (colors, shared) => StyleSheet.create({
  section: { 
    marginTop: 23 
  },
  headingRow: { 
    flexDirection: 'row', 
    gap: 10, 
    alignItems: 'center', 
    marginBottom: 12 
  },
  headingCopy: { 
    flex: 1 
  },
  title: { 
    color: colors.text, 
    fontSize: 17, 
    fontWeight: '900' 
  },
  subtitle: { 
    color: colors.muted, 
    fontSize: 12, 
    marginTop: 4 
  },
  offlineBadge: { 
    flexDirection: 'row', 
    gap: 6, 
    alignItems: 'center', 
    paddingVertical: 7, 
    paddingHorizontal: 10, 
    backgroundColor: colors.elevated, 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 999 
  },
  offlineText: { 
    color: colors.primary, 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 0.6 
  },
  frame: { 
    width: '100%', 
    aspectRatio: 16 / 9, 
    borderRadius: 18, 
    overflow: 'hidden', 
    backgroundColor: colors.background, 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  video: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: colors.background 
  },
  messageOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: colors.surface, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8, 
    padding: 15 
  },
  error: { 
    color: colors.text, 
    textAlign: 'center', 
    fontSize: 12 
  },
  progressRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 9, 
    marginTop: 15 
  },
  time: { 
    color: colors.muted, 
    fontSize: 12, 
    fontVariant: ['tabular-nums'] 
  },
  trackTouch: { 
    flex: 1, 
    height: 25, 
    justifyContent: 'center' 
  },
  track: { 
    backgroundColor: colors.border, 
    height: 5, 
    borderRadius: 3, 
    position: 'relative' 
  },
  fill: { 
    backgroundColor: colors.primary, 
    height: 5, 
    borderRadius: 3 
  },
  dot: { 
    position: 'absolute', 
    top: -5, 
    width: 15, 
    height: 15, 
    marginLeft: -7, 
    borderRadius: 8, 
    backgroundColor: colors.primary, 
    borderWidth: 2, 
    borderColor: colors.surface 
  },
  controls: { 
    flexDirection: 'row', 
    marginTop: 10, 
    gap: 7 
  },
  control: { 
    flex: 1, 
    minHeight: 40, 
    paddingHorizontal: 5, 
    borderRadius: 13, 
    backgroundColor: colors.elevated, 
    borderWidth: 1, 
    borderColor: colors.border, 
    flexDirection: 'row', 
    gap: 6, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  primaryControl: { 
    backgroundColor: colors.primary, 
    borderColor: colors.primary 
  },
  primaryControlText: { 
    color: colors.primaryDark, 
    fontSize: 12, 
    fontWeight: '900' 
  },
  controlText: { 
    color: colors.text, 
    fontSize: 11, 
    fontWeight: '800' 
  },
  note: { 
    fontSize: 11, 
    lineHeight: 18, 
    color: colors.muted, 
    marginTop: 13 
  },
});
