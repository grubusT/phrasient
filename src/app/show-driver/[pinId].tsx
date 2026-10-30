import { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { getPin } from '../../db/pins';
import type { Pin } from '../../db/types';
import { languageForCountry } from '../../phrases/languages';
import { getPhrasePack } from '../../phrases/loader';
import { color, space, type } from '../../theme';

/**
 * Held up for someone else to read: a driver, a shopkeeper, a stranger. The
 * screen stays awake and shows one thing as large as it will go.
 */
export default function ShowDriverScreen() {
  const { pinId, mode, phraseId } = useLocalSearchParams<{
    pinId: string;
    mode?: string;
    phraseId?: string;
  }>();
  const router = useRouter();
  useKeepAwake();

  const [pin, setPin] = useState<Pin | null>(null);

  useEffect(() => {
    getPin(Number(pinId)).then(setPin);
  }, [pinId]);

  if (!pin) return null;

  let primary = '';
  let secondary = '';

  if (mode === 'phrase' && phraseId) {
    const languageCode = languageForCountry(pin.country_code);
    const phrase = languageCode
      ? getPhrasePack(languageCode)?.phrases.find((p) => p.id === phraseId)
      : undefined;
    if (phrase) {
      primary = phrase.target;
      secondary = phrase.english;
    }
  } else {
    primary = pin.official_address ?? pin.official_name ?? pin.address_en ?? pin.display_name;
    secondary = pin.address_en ?? pin.display_name;
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Pressable
        style={styles.close}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
      <Text style={styles.primary} adjustsFontSizeToFit numberOfLines={6} minimumFontScale={0.4}>
        {primary}
      </Text>
      {secondary !== primary && secondary !== '' && (
        <Text style={styles.secondary}>{secondary}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.driverGround,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  close: {
    position: 'absolute',
    top: 48,
    right: space.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { color: color.driverInk, fontSize: 20 },
  primary: { ...type.driver, color: color.driverInk, textAlign: 'center' },
  secondary: {
    ...type.body,
    color: color.muted,
    marginTop: space.xl,
    textAlign: 'center',
  },
});
