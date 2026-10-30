import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listLegsForTrip, getLegForDate } from '../../../db/trips';
import { listStopsForDay } from '../../../db/stops';
import type { Leg, Stop } from '../../../db/types';
import { STOP_TYPE_LABELS } from '../../../components/stopTypeLabels';
import { addDaysISO, formatDisplayDate, todayISO } from '../../../lib/date';

export default function DayViewScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [legs, setLegs] = useState<Leg[]>([]);
  const [currentLeg, setCurrentLeg] = useState<Leg | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [stops, setStops] = useState<Stop[]>([]);

  const loadLegs = useCallback(async () => {
    const tripLegs = await listLegsForTrip(Number(tripId));
    setLegs(tripLegs);
    if (tripLegs.length === 0) {
      setCurrentLeg(null);
      return;
    }

    const today = todayISO();
    const legForToday = await getLegForDate(Number(tripId), today);
    if (legForToday) {
      setCurrentLeg(legForToday);
      setSelectedDate(today);
    } else {
      const fallback = today < tripLegs[0].start_date ? tripLegs[0] : tripLegs[tripLegs.length - 1];
      setCurrentLeg(fallback);
      setSelectedDate(fallback.start_date);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadLegs();
    }, [loadLegs])
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentLeg) {
        setStops([]);
        return;
      }
      listStopsForDay(currentLeg.id, selectedDate).then(setStops);
    }, [currentLeg, selectedDate])
  );

  const selectLeg = (leg: Leg) => {
    setCurrentLeg(leg);
    const today = todayISO();
    setSelectedDate(today >= leg.start_date && today <= leg.end_date ? today : leg.start_date);
  };

  const shiftDay = (delta: number) => {
    if (!currentLeg) return;
    const next = addDaysISO(selectedDate, delta);
    if (next < currentLeg.start_date || next > currentLeg.end_date) return;
    setSelectedDate(next);
  };

  if (legs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>This trip has no legs yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push(`/search${currentLeg ? `?languageCode=${currentLeg.language_code}` : ''}`)
              }
            >
              <Text style={styles.searchLink}>Search</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.legRow}>
        {legs.map((leg) => (
          <Pressable
            key={leg.id}
            style={[styles.legPill, currentLeg?.id === leg.id && styles.legPillSelected]}
            onPress={() => selectLeg(leg)}
          >
            <Text
              style={[
                styles.legPillText,
                currentLeg?.id === leg.id && styles.legPillTextSelected,
              ]}
            >
              {leg.country_code}
            </Text>
          </Pressable>
        ))}
      </View>

      {currentLeg && (
        <View style={styles.dateRow}>
          <Pressable
            onPress={() => shiftDay(-1)}
            disabled={selectedDate <= currentLeg.start_date}
          >
            <Text
              style={[
                styles.dateArrow,
                selectedDate <= currentLeg.start_date && styles.dateArrowDisabled,
              ]}
            >
              {'<'}
            </Text>
          </Pressable>
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
          <Pressable onPress={() => shiftDay(1)} disabled={selectedDate >= currentLeg.end_date}>
            <Text
              style={[
                styles.dateArrow,
                selectedDate >= currentLeg.end_date && styles.dateArrowDisabled,
              ]}
            >
              {'>'}
            </Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={stops}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No stops for this day.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.stopRow}
            onPress={() => router.push(`/trips/${tripId}/stop/${item.id}`)}
          >
            <View>
              <Text style={styles.stopTime}>{item.time ?? ''}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text style={styles.stopName}>{item.name}</Text>
              <Text style={styles.stopType}>{STOP_TYPE_LABELS[item.stop_type]}</Text>
            </View>
          </Pressable>
        )}
      />

      {currentLeg && (
        <Pressable
          style={[styles.addButton, { marginBottom: insets.bottom + 16 }]}
          onPress={() =>
            router.push(`/trips/${tripId}/stop/new?legId=${currentLeg.id}&date=${selectedDate}`)
          }
        >
          <Text style={styles.addButtonText}>+ Add Stop</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchLink: { color: '#1a73e8', fontWeight: '600', fontSize: 15, marginRight: 4 },
  legRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 0 },
  legPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  legPillSelected: { backgroundColor: '#1a73e8' },
  legPillText: { color: '#333', fontWeight: '600' },
  legPillTextSelected: { color: '#fff' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
  },
  dateArrow: { fontSize: 20, fontWeight: '700', color: '#1a73e8', paddingHorizontal: 12 },
  dateArrowDisabled: { color: '#ccc' },
  dateText: { fontSize: 16, fontWeight: '600', minWidth: 140, textAlign: 'center' },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 48, color: '#666' },
  stopRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  stopTime: { fontSize: 14, color: '#1a73e8', fontWeight: '700', minWidth: 48 },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '600' },
  stopType: { fontSize: 13, color: '#666', marginTop: 2 },
  addButton: {
    margin: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
