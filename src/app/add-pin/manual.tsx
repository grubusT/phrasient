import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPin, listPinsForTrip } from '../../db/pins';
import { getTrip } from '../../db/trips';
import type { Pin, StopType, Trip } from '../../db/types';
import { SUPPORTED_COUNTRIES } from '../../phrases/languages';
import { defaultDayForNewPin, tripDays } from '../../lib/trip';
import { DayStepper } from '../../components/DayStepper';
import { PillPicker } from '../../components/PillPicker';
import { STOP_TYPE_LABELS, STOP_TYPES } from '../../components/stopTypeLabels';
import { color, radius, space, type } from '../../theme';

const STOP_TYPE_OPTIONS = STOP_TYPES.map((t) => ({ value: t, label: STOP_TYPE_LABELS[t] }));
const COUNTRY_OPTIONS = SUPPORTED_COUNTRIES.map((c) => ({ value: c.countryCode, label: c.countryName }));

/**
 * A pin dropped by long-pressing the map, typed in by hand. Needs no network, so
 * it is also the way to add a pin offline or once search is used up.
 */
export default function ManualPinScreen() {
  const params = useLocalSearchParams<{ tripId: string; lat: string; lng: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [officialName, setOfficialName] = useState('');
  const [officialAddress, setOfficialAddress] = useState('');
  const [countryCode, setCountryCode] = useState(SUPPORTED_COUNTRIES[0].countryCode);
  const [stopType, setStopType] = useState<StopType>('other');
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    const tripId = Number(params.tripId);
    Promise.all([getTrip(tripId), listPinsForTrip(tripId)]).then(([t, p]) => {
      setTrip(t);
      setPins(p);
      if (t) setDay(defaultDayForNewPin(tripDays(t, p), p));
      // A hand-dropped pin is most likely in the same country as the trip's latest one.
      const latest = p[p.length - 1];
      if (latest && SUPPORTED_COUNTRIES.some((c) => c.countryCode === latest.country_code)) {
        setCountryCode(latest.country_code);
      }
    });
  }, [params.tripId]);

  const days = useMemo(() => (trip ? tripDays(trip, pins) : []), [trip, pins]);
  const canSave = trip !== null && day !== null && displayName.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    await createPin({
      trip_id: trip.id,
      day_date: day,
      display_name: displayName.trim(),
      official_name: officialName.trim() || null,
      official_address: officialAddress.trim() || null,
      name_en: displayName.trim(),
      address_en: null,
      country_code: countryCode,
      stop_type: stopType,
      lat: Number(params.lat),
      lng: Number(params.lng),
      place_id: null,
      place_types: null,
      source: 'manual',
    });
    router.back();
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
        autoFocus
      />

      <Text style={styles.label}>Name in local script</Text>
      <TextInput
        style={[styles.input, styles.scriptInput]}
        value={officialName}
        onChangeText={setOfficialName}
        placeholder="As it is written locally"
        placeholderTextColor={color.muted}
        autoCorrect={false}
      />
      <Text style={styles.label}>Address in local script</Text>
      <TextInput
        style={[styles.input, styles.scriptInput]}
        value={officialAddress}
        onChangeText={setOfficialAddress}
        placeholder="As it is written locally"
        placeholderTextColor={color.muted}
        autoCorrect={false}
        multiline
      />
      <Text style={styles.hint}>
        The driver card shows these. Copy them exactly, from a sign, a booking or a message.
      </Text>

      <Text style={styles.label}>Country</Text>
      <PillPicker
        options={COUNTRY_OPTIONS}
        value={countryCode}
        onChange={setCountryCode}
        accessibilityLabel="Country"
      />

      <Text style={styles.label}>Type</Text>
      <PillPicker
        options={STOP_TYPE_OPTIONS}
        value={stopType}
        onChange={setStopType}
        accessibilityLabel="Stop type"
      />

      {day && (
        <>
          <Text style={styles.label}>Day</Text>
          <DayStepper days={days} value={day} onChange={setDay} />
        </>
      )}

      <Pressable
        style={[styles.primary, !canSave && styles.primaryDisabled]}
        onPress={save}
        disabled={!canSave}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Add to trip</Text>
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
  scriptInput: { ...type.script },
  primary: {
    marginTop: space.xl,
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { ...type.body, color: color.paper },
});
