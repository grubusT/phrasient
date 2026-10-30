import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listPinsForTrip, movePin } from '../../db/pins';
import { listTrips } from '../../db/trips';
import type { Pin, Trip } from '../../db/types';
import { buildStyle } from '../../map/style';
import { NumberedPin } from '../../components/map/NumberedPin';
import { TripSheet } from '../../components/sheet/TripSheet';
import { applyMove, connectorSegments, pickActiveTrip, pinBounds, tripOrderNumbers } from '../../lib/trip';
import { color, mapColor, motion, radius, space, type } from '../../theme';

const MAP_STYLE = buildStyle();

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const camera = useRef<CameraRef>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const active = pickActiveTrip(await listTrips());
    return { active, pins: active ? await listPinsForTrip(active.id) : [] };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().then((result) => {
        if (cancelled) return;
        setTrip(result.active);
        setPins(result.pins);
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const numbers = useMemo(() => tripOrderNumbers(pins), [pins]);
  const placed = useMemo(() => pins.filter((p) => p.lat !== null && p.lng !== null), [pins]);
  const bounds = useMemo(() => pinBounds(pins), [pins]);
  const connector = useMemo<GeoJSON.Feature>(
    () => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'MultiLineString', coordinates: connectorSegments(pins) },
    }),
    [pins]
  );

  const onSelectPin = useCallback(
    (pin: Pin) => {
      setSelectedPinId(pin.id);
      if (pin.lat === null || pin.lng === null) return;
      // Centre the pin in the map left visible above the sheet at its half snap.
      camera.current?.flyTo({ center: [pin.lng, pin.lat], padding: { bottom: height / 2 }, duration: motion.cameraMs });
    },
    [height]
  );

  const onMovePin = useCallback(
    (pinId: number, day: string, index: number) => {
      // Show the drop immediately; the list would otherwise snap back until SQLite answers.
      setPins((current) => applyMove(current, pinId, day, index));
      movePin(pinId, day, index).catch(() => load().then((result) => setPins(result.pins)));
    },
    [load]
  );

  return (
    <View style={styles.root}>
      <Map
        style={styles.map}
        mapStyle={MAP_STYLE}
        // North up and flat: the map orients a trip, it does not navigate one,
        // and without rotation there is no compass to find room for.
        touchRotate={false}
        touchPitch={false}
        compass={false}
        logo={false}
        // The sheet covers the bottom, so the attribution sits top left.
        attributionPosition={{ top: insets.top + space.md, left: space.lg }}
        tintColor={color.muted}
        onPress={() => setSelectedPinId(null)}
        onLongPress={(e) => {
          if (!trip) return;
          const [lng, lat] = e.nativeEvent.lngLat;
          router.push({ pathname: '/add-pin/manual', params: { tripId: trip.id, lat, lng } });
        }}
      >
        <Camera
          ref={camera}
          initialViewState={
            bounds ? { bounds } : { center: [105.8342, 21.0278], zoom: 11 }
          }
        />
        <GeoJSONSource id="connector" data={connector}>
          <Layer
            id="connector"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': mapColor.connector,
              'line-opacity': 0.4,
              'line-width': 2,
              'line-dasharray': [0, 2],
            }}
          />
        </GeoJSONSource>
        {placed.map((pin) => (
          <Marker key={pin.id} id={String(pin.id)} lngLat={[pin.lng!, pin.lat!]}>
            <Pressable
              onPress={() => setSelectedPinId(pin.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${numbers.get(pin.id) ?? ''}. ${pin.display_name}`}
            >
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

      <TripSheet
        trip={trip}
        pins={pins}
        numbers={numbers}
        selectedPinId={selectedPinId}
        onSelectPin={onSelectPin}
        onMovePin={onMovePin}
        onFindOnMap={(pin) =>
          router.push({ pathname: '/add-pin', params: { tripId: pin.trip_id, pinId: pin.id } })
        }
        onEditPin={(pin) => router.push({ pathname: '/pin/[pinId]/edit', params: { pinId: pin.id } })}
        onGoToTrips={() => router.push('/trips')}
      />
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
});
