import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { deleteStop, getStop } from '../../../../db/stops';
import { getLeg } from '../../../../db/trips';
import type { Leg, Stop } from '../../../../db/types';
import { getPhrasePack } from '../../../../phrasebook/loader';
import { categoriesForStopType } from '../../../../phrasebook/stopTypeMap';
import type { Phrase } from '../../../../phrasebook/types';
import { AudioPlayButton } from '../../../../components/AudioPlayButton';
import { STOP_TYPE_LABELS } from '../../../../components/stopTypeLabels';

export default function StopDetailScreen() {
  const { tripId, stopId } = useLocalSearchParams<{ tripId: string; stopId: string }>();
  const router = useRouter();
  const [stop, setStop] = useState<Stop | null>(null);
  const [leg, setLeg] = useState<Leg | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStop(Number(stopId)).then(async (s) => {
        setStop(s);
        if (s) setLeg(await getLeg(s.leg_id));
      });
    }, [stopId])
  );

  if (!stop || !leg) return null;

  const pack = getPhrasePack(leg.language_code);
  const categories = categoriesForStopType(stop.stop_type);
  const phrases: Phrase[] = pack
    ? pack.phrases.filter((p) => categories.includes(p.category))
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.stopType}>{STOP_TYPE_LABELS[stop.stop_type]}</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push(`/trips/${tripId}/stop/new?stopId=${stop.id}`)}>
              <Text style={styles.actionLink}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await deleteStop(stop.id);
                router.back();
              }}
            >
              <Text style={styles.actionLinkDelete}>Delete</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.name}>{stop.name}</Text>
        {stop.name_local && <Text style={styles.nameLocal}>{stop.name_local}</Text>}

        {(stop.address || stop.address_local) && (
          <View style={styles.addressBlock}>
            {stop.address && <Text style={styles.address}>{stop.address}</Text>}
            {stop.address_local && <Text style={styles.addressLocal}>{stop.address_local}</Text>}
          </View>
        )}

        {stop.address_local && (
          <Pressable
            style={styles.driverButton}
            onPress={() => router.push(`/show-driver/${stop.id}?mode=address`)}
          >
            <Text style={styles.driverButtonText}>Show the driver</Text>
          </Pressable>
        )}
      </View>

      {!pack && (
        <Text style={styles.warning}>No phrase pack available for {leg.language_code}.</Text>
      )}

      {pack && !pack.reviewed && (
        <Text style={styles.warning}>
          Phrases for {pack.language} have not yet been reviewed by a native speaker.
        </Text>
      )}

      <Text style={styles.sectionTitle}>Useful phrases</Text>
      {phrases.map((phrase) => (
        <View key={phrase.id} style={styles.phraseRow}>
          <Pressable
            style={styles.phraseText}
            onPress={() => router.push(`/show-driver/${stop.id}?mode=phrase&phraseId=${phrase.id}`)}
          >
            <Text style={styles.phraseEnglish}>{phrase.english}</Text>
            <Text style={styles.phraseTarget}>{phrase.target}</Text>
            <Text style={styles.phraseRoman}>{phrase.romanization}</Text>
          </Pressable>
          <AudioPlayButton text={phrase.target} locale={pack!.ttsLocale} audioPath={phrase.audio} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: '#f7f7f7', borderRadius: 12, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 16 },
  actionLink: { color: '#1a73e8', fontWeight: '600' },
  actionLinkDelete: { color: '#d32f2f', fontWeight: '600' },
  stopType: { fontSize: 13, color: '#1a73e8', fontWeight: '700', marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '700' },
  nameLocal: { fontSize: 18, color: '#444', marginTop: 2 },
  addressBlock: { marginTop: 12 },
  address: { fontSize: 15, color: '#444' },
  addressLocal: { fontSize: 16, color: '#111', marginTop: 2, fontWeight: '600' },
  driverButton: {
    marginTop: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  driverButtonText: { color: '#fff', fontWeight: '700' },
  warning: {
    marginTop: 16,
    color: '#8a6d00',
    backgroundColor: '#fff6da',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  phraseText: { flex: 1 },
  phraseEnglish: { fontSize: 14, color: '#666' },
  phraseTarget: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  phraseRoman: { fontSize: 13, color: '#888', marginTop: 1 },
});
