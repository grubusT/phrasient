import { Pressable, StyleSheet, Text } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AUDIO_ASSETS } from '../phrasebook/audioAssets';

interface Props {
  text: string;
  locale: string;
  audioPath: string | null;
}

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
    <Pressable style={styles.button} onPress={handlePress} hitSlop={8}>
      <Text style={styles.icon}>🔊</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f0fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16 },
});
