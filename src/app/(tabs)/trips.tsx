import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTrip, deleteTrip, listTrips, renameTrip } from '../../db/trips';
import type { Trip } from '../../db/types';
import { formatDisplayDate, todayISO } from '../../lib/date';
import { color, radius, space, type } from '../../theme';

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newName, setNewName] = useState('');

  const reload = useCallback(() => {
    listTrips().then(setTrips);
  }, []);

  useFocusEffect(reload);

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    await createTrip(name, todayISO());
    setNewName('');
    reload();
  };

  const confirmDelete = (trip: Trip) => {
    Alert.alert(
      `Delete ${trip.name}?`,
      'Its pins and any offline maps go with it. This cannot be undone.',
      [
        { text: 'Keep trip', style: 'cancel' },
        {
          text: 'Delete trip',
          style: 'destructive',
          onPress: async () => {
            await deleteTrip(trip.id);
            reload();
          },
        },
      ]
    );
  };

  const promptRename = (trip: Trip) => {
    Alert.prompt?.('Rename trip', undefined, async (name) => {
      if (!name?.trim()) return;
      await renameTrip(trip.id, name.trim());
      reload();
    }, 'plain-text', trip.name);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.lg }]}>
      <Text style={styles.heading}>Trips</Text>

      <View style={styles.newRow}>
        <TextInput
          style={styles.input}
          value={newName}
          onChangeText={setNewName}
          placeholder="Name a new trip"
          placeholderTextColor={color.muted}
          returnKeyType="done"
          onSubmitEditing={create}
        />
        <Pressable style={styles.addButton} onPress={create}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Name your first trip above.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.tripRow}
            onLongPress={() => promptRename(item)}
            onPress={() => confirmDelete(item)}
          >
            <View style={styles.tripText}>
              <Text style={styles.tripName}>{item.name}</Text>
              {item.start_date && (
                <Text style={styles.tripDate}>From {formatDisplayDate(item.start_date)}</Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.lg },
  heading: { ...type.title, color: color.ink, marginBottom: space.lg },
  newRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.lg },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    color: color.ink,
  },
  addButton: {
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
  },
  addButtonText: { ...type.body, color: color.paper },
  list: { gap: space.sm, flexGrow: 1 },
  empty: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xxl },
  tripRow: {
    backgroundColor: color.wash,
    borderRadius: radius.md,
    padding: space.lg,
  },
  tripText: { gap: space.xs },
  tripName: { ...type.body, color: color.ink },
  tripDate: { ...type.caption, color: color.muted },
});
