import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listTrips } from '../db/trips';
import type { Trip } from '../db/types';

export default function TripsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);

  useFocusEffect(
    useCallback(() => {
      listTrips().then(setTrips);
    }, [])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No trips yet. Create one to get started.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.tripRow}
            onPress={() => router.push(`/trips/${item.id}`)}
          >
            <Text style={styles.tripName}>{item.name}</Text>
          </Pressable>
        )}
      />
      <Pressable
        style={[styles.addButton, { marginBottom: insets.bottom + 16 }]}
        onPress={() => router.push('/trips/new')}
      >
        <Text style={styles.addButtonText}>+ New Trip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 48, color: '#666' },
  tripRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    marginBottom: 10,
  },
  tripName: { fontSize: 18, fontWeight: '600' },
  addButton: {
    margin: 16,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
