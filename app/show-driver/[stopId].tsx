import { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { getStop } from '../../db/stops';
import { getLeg } from '../../db/trips';
import type { Stop } from '../../db/types';
import { getPhrasePack } from '../../phrasebook/loader';

export default function ShowDriverScreen() {
  const { stopId, mode, phraseId } = useLocalSearchParams<{
    stopId: string;
    mode?: string;
    phraseId?: string;
  }>();
  const router = useRouter();
  useKeepAwake();

  const [stop, setStop] = useState<Stop | null>(null);
  const [languageCode, setLanguageCode] = useState<string | null>(null);

  useEffect(() => {
    getStop(Number(stopId)).then(async (s) => {
      setStop(s);
      if (s) {
        const leg = await getLeg(s.leg_id);
        setLanguageCode(leg?.language_code ?? null);
      }
    });
  }, [stopId]);

  if (!stop) return null;

  let bigText = '';
  let smallText = '';

  if (mode === 'phrase' && phraseId && languageCode) {
    const pack = getPhrasePack(languageCode);
    const phrase = pack?.phrases.find((p) => p.id === phraseId);
    if (phrase) {
      bigText = phrase.target;
      smallText = phrase.english;
    }
  } else {
    bigText = stop.address_local ?? stop.address ?? '';
    smallText = stop.address ?? stop.name;
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <Text style={styles.bigText}>{bigText}</Text>
      {smallText && <Text style={styles.smallText}>{smallText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20 },
  bigText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
    textAlign: 'center',
  },
  smallText: {
    color: '#aaa',
    fontSize: 20,
    marginTop: 24,
    textAlign: 'center',
  },
});
