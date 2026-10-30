import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deletePin, getPin, listPinsForTrip, movePin, renamePin, setPinType } from '../../../db/pins';
import { getTrip } from '../../../db/trips';
import type { Pin, StopType, Trip } from '../../../db/types';
import { tripDays } from '../../../lib/trip';
import { DayStepper } from '../../../components/DayStepper';
import { PillPicker } from '../../../components/PillPicker';
import { STOP_TYPE_LABELS, STOP_TYPES } from '../../../components/stopTypeLabels';
import { color, radius, space, type } from '../../../theme';

const STOP_TYPE_OPTIONS = STOP_TYPES.map((t) => ({ value: t, label: STOP_TYPE_LABELS[t] }));

/**
 * Rename, retype, move to another day, or delete a pin. Only the display name is
 * editable: the official local-script text belongs to the driver card.
 */
export default function EditPinScreen() {
  const { pinId } = useLocalSearchParams<{ pinId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pin, setPin] = useState<Pin | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [stopType, setStopType] = useState<StopType>('other');
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    getPin(Number(pinId)).then(async (p) => {
      if (!p) return;
      const [t, all] = await Promise.all([getTrip(p.trip_id), listPinsForTrip(p.trip_id)]);
      setPin(p);
      setTrip(t);
      setPins(all);
      setDisplayName(p.display_name);
      setStopType(p.stop_type);
      setDay(p.day_date);
    });
  }, [pinId]);

  const days = useMemo(() => {
    if (!trip || !pin) return [];
    const all = tripDays(trip, pins);
    // A pin dated before the trip's start still needs its own day to be selectable.
    return all.includes(pin.day_date) ? all : [pin.day_date, ...all];
  }, [trip, pins, pin]);

  if (!pin || !day) return null;
  const canSave = displayName.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    if (displayName.trim() !== pin.display_name) await renamePin(pin.id, displayName.trim());
    if (stopType !== pin.stop_type) await setPinType(pin.id, stopType);
    if (day !== pin.day_date) {
      // A pin moved to another day goes to the end of it.
      const endOfDay = pins.filter((p) => p.day_date === day && p.id !== pin.id).length;
      await movePin(pin.id, day, endOfDay);
    }
    router.back();
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${pin.display_name}?`,
      'It comes off the map and out of the trip. Phrases you saved stay in your pinbook.',
      [
        { text: 'Keep pin', style: 'cancel' },
        {
          text: 'Delete pin',
          style: 'destructive',
          onPress: async () => {
            await deletePin(pin.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space.xl }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="What you call this place"
        placeholderTextColor={color.muted}
      />
      {pin.official_name && (
        <Text style={styles.hint}>
          The driver card keeps showing {pin.official_name}, whatever you call it here.
        </Text>
      )}

      <Text style={styles.label}>Type</Text>
      <PillPicker options={STOP_TYPE_OPTIONS} value={stopType} onChange={setStopType} accessibilityLabel="Stop type" />

      <Text style={styles.label}>Day</Text>
      <DayStepper days={days} value={day} onChange={setDay} />

      <Pressable
        style={[styles.primary, !canSave && styles.primaryDisabled]}
        onPress={save}
        disabled={!canSave}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Save</Text>
      </Pressable>

      <Pressable style={styles.delete} onPress={confirmDelete} accessibilityRole="button">
        <Text style={styles.deleteText}>Delete pin</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  content: { padding: space.lg, gap: space.sm },
  label: { ...type.caption, color: color.muted, marginTop: space.sm },
  hint: { ...type.caption, color: color.muted },
  input: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    color: color.ink,
  },
  primary: {
    marginTop: space.xl,
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { ...type.body, color: color.paper },
  delete: { minHeight: space.xxl + space.md, justifyContent: 'center', alignItems: 'center' },
  deleteText: { ...type.body, color: color.danger },
});
