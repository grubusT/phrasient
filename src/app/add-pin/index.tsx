import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createPin, getPin, listPinsForTrip, setPinLocation } from '../../db/pins';
import { placesCallsToday } from '../../db/placesUsage';
import { getTrip } from '../../db/trips';
import type { Pin, StopType, Trip } from '../../db/types';
import { isFixturePlaceSearch, placeSearch, PLACES_DAILY_LIMIT } from '../../places';
import { newSessionToken } from '../../places/session';
import { PlacesError, type PlaceRecord, type PlaceSuggestion } from '../../places/types';
import { countryName, languageForCountry } from '../../phrases/languages';
import { defaultDayForNewPin, tripDays } from '../../lib/trip';
import { DayStepper } from '../../components/DayStepper';
import { PillPicker } from '../../components/PillPicker';
import { STOP_TYPE_LABELS, STOP_TYPES } from '../../components/stopTypeLabels';
import { color, radius, space, type } from '../../theme';

const MIN_QUERY = 3;
const DEBOUNCE_MS = 300;
const STOP_TYPE_OPTIONS = STOP_TYPES.map((t) => ({ value: t, label: STOP_TYPE_LABELS[t] }));

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'results'; suggestions: PlaceSuggestion[] }
  | { status: 'error'; error: unknown };

const IDLE: SearchState = { status: 'idle' };

/**
 * Places search for a new pin. With `pinId`, it instead puts an existing pin
 * that has no coordinates (one migrated from v1) on the map.
 */
export default function AddPinScreen() {
  const params = useLocalSearchParams<{ tripId: string; pinId?: string; lat?: string; lng?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [placing, setPlacing] = useState<Pin | null>(null);
  const [quotaSpent, setQuotaSpent] = useState(false);

  const [session, setSession] = useState(newSessionToken);
  const [query, setQuery] = useState('');
  // Tagged with the query it answers, so a stale answer is never shown for a newer query.
  const [answer, setAnswer] = useState<{ query: string; state: SearchState }>({ query: '', state: IDLE });

  const [record, setRecord] = useState<PlaceRecord | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [stopType, setStopType] = useState<StopType>('other');
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    getTrip(Number(params.tripId)).then(setTrip);
    listPinsForTrip(Number(params.tripId)).then(setPins);
    if (!isFixturePlaceSearch) {
      placesCallsToday().then((n) => setQuotaSpent(n >= PLACES_DAILY_LIMIT));
    }
    if (params.pinId) {
      getPin(Number(params.pinId)).then((pin) => {
        setPlacing(pin);
        if (pin) setQuery(pin.display_name);
      });
    }
  }, [params.tripId, params.pinId]);

  const days = useMemo(() => (trip ? tripDays(trip, pins) : []), [trip, pins]);
  // Kept as numbers rather than an object so the search effect does not re-run every render.
  const nearLat = params.lat ? Number(params.lat) : undefined;
  const nearLng = params.lng ? Number(params.lng) : undefined;

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY || record) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setAnswer({ query: q, state: { status: 'loading' } });
      const bias = nearLat !== undefined && nearLng !== undefined ? { lat: nearLat, lng: nearLng } : undefined;
      placeSearch.suggest(q, { session, near: bias, signal: controller.signal }).then(
        (suggestions) => setAnswer({ query: q, state: { status: 'results', suggestions } }),
        (error: unknown) => {
          if (!controller.signal.aborted) setAnswer({ query: q, state: { status: 'error', error } });
        }
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, session, record, nearLat, nearLng]);

  const choose = async (suggestion: PlaceSuggestion) => {
    setLoadingDetails(true);
    try {
      const details = await placeSearch.details(suggestion.providerId, { session });
      setRecord(details);
      setStopType(placing?.stop_type ?? details.stopType);
      setDay(defaultDayForNewPin(days, pins));
    } catch (error) {
      setAnswer({ query: query.trim(), state: { status: 'error', error } });
    } finally {
      // A Details call ends the billing session; the next search starts a new one.
      setSession(newSessionToken());
      setLoadingDetails(false);
    }
  };

  const save = async () => {
    if (!record || !trip) return;
    if (placing) {
      await setPinLocation(placing.id, {
        lat: record.lat,
        lng: record.lng,
        place_id: record.providerId,
        place_types: record.providerTypes,
        official_name: record.nameLocal,
        official_address: record.addressLocal,
      });
    } else {
      await createPin({
        trip_id: trip.id,
        day_date: day ?? days[0],
        display_name: record.nameEn,
        official_name: record.nameLocal,
        official_address: record.addressLocal,
        name_en: record.nameEn,
        address_en: record.addressEn,
        country_code: record.countryCode,
        stop_type: stopType,
        lat: record.lat,
        lng: record.lng,
        place_id: record.providerId,
        place_types: record.providerTypes,
        source: 'google',
      });
    }
    router.back();
  };

  const search = answer.query === query.trim() ? answer.state : IDLE;

  if (record) {
    const hasPack = languageForCountry(record.countryCode) !== null;
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.confirm, { paddingBottom: insets.bottom + space.xl }]}
      >
        <View style={styles.card}>
          <Text style={styles.english}>{record.nameEn}</Text>
          {record.nameLocal && <Text style={styles.script}>{record.nameLocal}</Text>}
          {record.addressLocal && <Text style={styles.body}>{record.addressLocal}</Text>}
          {record.addressEn && <Text style={styles.caption}>{record.addressEn}</Text>}
        </View>
        {!hasPack && (
          <Text style={styles.notice}>
            There is no phrasebook for {countryName(record.countryCode)} yet. The pin will show on the
            map without phrases.
          </Text>
        )}

        {!placing && (
          <>
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
          </>
        )}

        <Pressable style={styles.primary} onPress={save} accessibilityRole="button">
          <Text style={styles.primaryText}>{placing ? 'Put on the map' : 'Add to trip'}</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => setRecord(null)} accessibilityRole="button">
          <Text style={styles.secondaryText}>Search again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.searchArea}>
        {isFixturePlaceSearch && (
          <Text style={styles.notice}>
            Sample places only, from Hanoi and Shanghai. Set up Google Places to search everywhere.
          </Text>
        )}
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={placing ? `Find ${placing.display_name}` : 'Search for a place'}
          placeholderTextColor={color.muted}
          autoFocus
          autoCorrect={false}
          editable={!quotaSpent}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={search.status === 'results' ? search.suggestions : []}
        keyExtractor={(s) => s.providerId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
        ListHeaderComponent={
          <SearchStatus
            state={search}
            query={query.trim()}
            quotaSpent={quotaSpent}
            loadingDetails={loadingDetails}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.result}
            onPress={() => choose(item)}
            disabled={loadingDetails}
            accessibilityRole="button"
          >
            <Text style={styles.body}>{item.primaryText}</Text>
            {item.secondaryText ? <Text style={styles.caption}>{item.secondaryText}</Text> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const MANUAL_HINT = 'You can still long-press the map to add a pin by hand.';

function SearchStatus({
  state,
  query,
  quotaSpent,
  loadingDetails,
}: {
  state: SearchState;
  query: string;
  quotaSpent: boolean;
  loadingDetails: boolean;
}) {
  if (quotaSpent) {
    return (
      <Text style={styles.status}>
        {"Today's place searches are used up. Search comes back tomorrow. "}
        {MANUAL_HINT}
      </Text>
    );
  }
  if (loadingDetails || state.status === 'loading') {
    return <ActivityIndicator style={styles.spinner} color={color.muted} />;
  }
  if (state.status === 'error') {
    const error = state.error;
    const message =
      error instanceof PlacesError ? error.message : 'Something went wrong with place search. Try again.';
    const offerManual = !(error instanceof PlacesError) || error.kind !== 'timeout';
    return <Text style={styles.status}>{offerManual ? `${message} ${MANUAL_HINT}` : message}</Text>;
  }
  if (state.status === 'results' && state.suggestions.length === 0) {
    return <Text style={styles.status}>No places match “{query}”.</Text>;
  }
  if (query.length < MIN_QUERY) {
    return <Text style={styles.status}>Type at least {MIN_QUERY} letters. {MANUAL_HINT}</Text>;
  }
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper },
  searchArea: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  input: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    color: color.ink,
  },
  list: { paddingHorizontal: space.lg, flexGrow: 1 },
  result: {
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
    gap: space.xs,
  },
  status: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xl },
  spinner: { marginTop: space.xl },
  notice: {
    ...type.caption,
    color: color.warningInk,
    backgroundColor: color.warningGround,
    borderRadius: radius.sm,
    padding: space.md,
  },
  confirm: { padding: space.lg, gap: space.md },
  card: { backgroundColor: color.wash, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  english: { ...type.caption, color: color.muted },
  script: { ...type.script, color: color.ink },
  body: { ...type.body, color: color.ink },
  caption: { ...type.caption, color: color.muted },
  label: { ...type.caption, color: color.muted, marginTop: space.sm },
  primary: {
    marginTop: space.lg,
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryText: { ...type.body, color: color.paper },
  secondary: { paddingVertical: space.md, alignItems: 'center' },
  secondaryText: { ...type.body, color: color.ink },
});
