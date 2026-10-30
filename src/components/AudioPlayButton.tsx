import { Pressable, StyleSheet, Text } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AUDIO_ASSETS } from '../phrases/audioAssets';
import { color, radius } from '../theme';

interface Props {
  text: string;
  locale: string;
  audioPath: string | null;
}

/** Plays a bundled recording when one exists, and falls back to TTS when it does not. */
export function AudioPlayButton({ text, locale, audioPath }: Props) {
  const handlePress = () => {
    const asset = audioPath ? AUDIO_ASSETS[audioPath] : undefined;
    if (asset) {
      createAudioPlayer(asset).play();
    } else {
      Speech.speak(text, { language: locale });
    }
  };

  return (
    <Pressable
      style={styles.button}
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Speak this phrase"
    >
      <Text style={styles.icon}>🔊</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16 },
});
