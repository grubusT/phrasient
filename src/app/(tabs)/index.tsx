import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listPinsForTrip } from '../../db/pins';
import { listTrips } from '../../db/trips';
import type { Pin, Trip } from '../../db/types';
import { ONLINE_STYLE_URL } from '../../map/style';
import { NumberedPin } from '../../components/map/NumberedPin';
import { groupPinsByDay, pickActiveTrip, pinBounds, tripOrderNumbers } from '../../lib/trip';
import { formatDisplayDate } from '../../lib/date';
import { color, radius, space, type } from '../../theme';

const SNAP_POINTS = ['14%', '45%', '92%'];

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheet>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listTrips().then(async (trips) => {
        const active = pickActiveTrip(trips);
        if (cancelled) return;
        setTrip(active);
        setPins(active ? await listPinsForTrip(active.id) : []);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const numbers = useMemo(() => tripOrderNumbers(pins), [pins]);
  const days = useMemo(() => groupPinsByDay(pins), [pins]);
  const placed = useMemo(() => pins.filter((p) => p.lat !== null && p.lng !== null), [pins]);
  const bounds = useMemo(() => pinBounds(pins), [pins]);

  return (
    <View style={styles.root}>
      <Map
        style={styles.map}
        mapStyle={ONLINE_STYLE_URL}
        onPress={() => setSelectedPinId(null)}
        onLongPress={(e) => {
          if (!trip) return;
          const [lng, lat] = e.nativeEvent.lngLat;
          router.push({ pathname: '/add-pin/manual', params: { tripId: trip.id, lat, lng } });
        }}
      >
        <Camera
          initialViewState={
            bounds ? { bounds } : { center: [105.8342, 21.0278], zoom: 11 }
          }
        />
        {placed.map((pin) => (
          <Marker key={pin.id} id={String(pin.id)} lngLat={[pin.lng!, pin.lat!]}>
            <Pressable onPress={() => setSelectedPinId(pin.id)} hitSlop={8}>
              <NumberedPin number={numbers.get(pin.id) ?? 0} selected={selectedPinId === pin.id} />
            </Pressable>
          </Marker>
        ))}
      </Map>

      {trip && (
        <Pressable
          style={[styles.addButton, { top: insets.top + space.md }]}
          onPress={() => {
            // Bias search toward where the trip already is.
            const center = bounds
              ? { lng: (bounds[0] + bounds[2]) / 2, lat: (bounds[1] + bounds[3]) / 2 }
              : {};
            router.push({ pathname: '/add-pin', params: { tripId: trip.id, ...center } });
          }}
          accessibilityRole="button"
          accessibilityLabel="Add a pin"
        >
          <Text style={styles.addButtonText}>Add pin</Text>
        </Pressable>
      )}

      <BottomSheet
        ref={sheet}
        index={0}
        snapPoints={SNAP_POINTS}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {trip === null ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptyBody}>Create a trip to start dropping pins.</Text>
              <Pressable style={styles.action} onPress={() => router.push('/trips')}>
                <Text style={styles.actionText}>Go to Trips</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.tripName}>{trip.name}</Text>
              {days.map((day) => (
                <View key={day.date} style={styles.day}>
                  <Text style={styles.dayDate}>{formatDisplayDate(day.date)}</Text>
                  {day.pins.map((pin) => (
                    <View key={pin.id} style={styles.pinRow}>
                      <NumberedPin number={numbers.get(pin.id) ?? 0} />
                      <View style={styles.pinText}>
                        <Text style={styles.pinName}>{pin.display_name}</Text>
                        {pin.official_name && (
                          <Text style={styles.pinScript}>{pin.official_name}</Text>
                        )}
                      </View>
                      {pin.lat === null && <Text style={styles.unplaced}>Not on the map</Text>}
                    </View>
                  ))}
                </View>
              ))}
              {pins.length === 0 && (
                <Text style={styles.emptyBody}>This trip has no pins yet.</Text>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.wash },
  map: { flex: 1 },
  addButton: {
    position: 'absolute',
    right: space.lg,
    backgroundColor: color.paper,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  addButtonText: { ...type.body, color: color.ink },
  sheetBackground: { backgroundColor: color.paper },
  sheetHandle: { backgroundColor: color.hairline, width: 36 },
  sheetContent: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  tripName: { ...type.title, color: color.ink },
  day: { gap: space.sm },
  dayDate: { ...type.caption, color: color.muted, marginTop: space.sm },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pinText: { flex: 1 },
  pinName: { ...type.body, color: color.ink },
  pinScript: { ...type.script, color: color.ink },
  unplaced: { ...type.caption, color: color.muted },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl },
  emptyTitle: { ...type.title, color: color.ink },
  emptyBody: { ...type.caption, color: color.muted, textAlign: 'center' },
  action: {
    marginTop: space.sm,
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  actionText: { ...type.body, color: color.paper },
});
