import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import BottomSheet, { BottomSheetView, useBottomSheetScrollableCreator } from '@gorhom/bottom-sheet';
import ReorderableList, { type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { scheduleOnRN } from 'react-native-worklets';
import type { Pin, Trip } from '../../db/types';
import { currentOrNextPin, dropTarget, sheetRows, type SheetRow } from '../../lib/trip';
import { formatDisplayDate, nowHHMM, todayISO } from '../../lib/date';
import { PeekCard } from './PeekCard';
import { PinRow } from './PinRow';
import { color, radius, space, type } from '../../theme';

interface Props {
  trip: Trip | null;
  pins: Pin[];
  numbers: Map<number, number>;
  selectedPinId: number | null;
  onSelectPin: (pin: Pin) => void;
  onMovePin: (pinId: number, day: string, index: number) => void;
  onFindOnMap: (pin: Pin) => void;
  onGoToTrips: () => void;
}

// @gorhom/bottom-sheet's default handle height; the peek snap is this plus the card.
const HANDLE_HEIGHT = 24;

/**
 * The map's bottom sheet. Peek shows one pin; half and full show the trip day
 * by day. Pins are reordered, and moved between days, by dragging them past
 * the day headers.
 */
export function TripSheet({
  trip,
  pins,
  numbers,
  selectedPinId,
  onSelectPin,
  onMovePin,
  onFindOnMap,
  onGoToTrips,
}: Props) {
  const [peekHeight, setPeekHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const snapPoints = useMemo(
    () => [Math.max(peekHeight, space.xxl * 2) + HANDLE_HEIGHT, '50%', '92%'],
    [peekHeight]
  );
  const renderScrollComponent = useBottomSheetScrollableCreator<ScrollViewProps>();

  const rows = useMemo(() => (trip ? sheetRows(trip, pins) : []), [trip, pins]);
  const dayNumbers = useMemo(
    () => new Map(rows.flatMap((r) => (r.kind === 'day' ? [[r.date, r.dayNumber] as const] : []))),
    [rows]
  );

  const peekPin =
    pins.find((p) => p.id === selectedPinId) ?? currentOrNextPin(pins, todayISO(), nowHHMM());
  const peekCaption = peekPin
    ? `Day ${dayNumbers.get(peekPin.day_date) ?? ''}${peekPin.lat === null ? ', not on the map yet' : ''}`
    : '';

  const move = useCallback(
    (from: number, to: number) => {
      const target = dropTarget(rows, from, to);
      if (target) onMovePin(target.pinId, target.day, target.index);
    },
    [rows, onMovePin]
  );

  const onReorder = ({ from, to }: ReorderableListReorderEvent) => move(from, to);

  const onDragStart = useCallback(() => {
    'worklet';
    scheduleOnRN(setDragging, true);
  }, []);
  const onDragEnd = useCallback(() => {
    'worklet';
    scheduleOnRN(setDragging, false);
  }, []);

  const renderItem = ({ item, index }: { item: SheetRow; index: number }) => {
    if (item.kind === 'day') {
      return (
        <View style={styles.day}>
          <Text style={styles.dayNumber}>Day {item.dayNumber}</Text>
          <Text style={styles.dayDate}>{formatDisplayDate(item.date)}</Text>
          {item.empty && <Text style={styles.dayEmpty}>Nothing planned</Text>}
        </View>
      );
    }
    return (
      <PinRow
        pin={item.pin}
        number={numbers.get(item.pin.id) ?? 0}
        selected={item.pin.id === selectedPinId}
        onPress={() => onSelectPin(item.pin)}
        onStep={(direction) => {
          const to = index + direction;
          if (to >= 0 && to < rows.length) move(index, to);
        }}
        onFindOnMap={() => onFindOnMap(item.pin)}
      />
    );
  };

  return (
    <BottomSheet
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      // While a pin is being dragged, vertical movement belongs to the list.
      enableContentPanningGesture={!dragging}
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      {trip === null ? (
        <BottomSheetView style={styles.noTrip}>
          <Text style={styles.noTripTitle}>No trips yet</Text>
          <Text style={styles.noTripBody}>Create a trip to start dropping pins.</Text>
          <Pressable style={styles.action} onPress={onGoToTrips} accessibilityRole="button">
            <Text style={styles.actionText}>Go to Trips</Text>
          </Pressable>
        </BottomSheetView>
      ) : (
        <View style={styles.content}>
          <View style={styles.peek} onLayout={(e) => setPeekHeight(e.nativeEvent.layout.height)}>
            <PeekCard
              pin={peekPin}
              number={peekPin ? numbers.get(peekPin.id) ?? 0 : 0}
              caption={peekCaption}
            />
          </View>
          <ReorderableList
            data={rows}
            keyExtractor={(row) => (row.kind === 'day' ? `day-${row.date}` : `pin-${row.pin.id}`)}
            renderItem={renderItem}
            renderScrollComponent={renderScrollComponent}
            onReorder={onReorder}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            ListHeaderComponent={<Text style={styles.tripName}>{trip.name}</Text>}
            contentContainerStyle={styles.list}
          />
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: color.paper, borderRadius: radius.lg },
  handle: { backgroundColor: color.hairline, width: space.xxl + space.xs },
  content: { flex: 1 },
  peek: {
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  list: { paddingHorizontal: space.sm, paddingBottom: space.xxl },
  tripName: {
    ...type.title,
    color: color.ink,
    paddingHorizontal: space.sm,
    paddingTop: space.lg,
  },
  day: { paddingHorizontal: space.sm, paddingTop: space.xl, paddingBottom: space.sm },
  dayNumber: { ...type.body, color: color.ink, fontWeight: type.title.fontWeight },
  dayDate: { ...type.caption, color: color.muted },
  dayEmpty: { ...type.caption, color: color.muted, marginTop: space.sm },
  noTrip: { alignItems: 'center', gap: space.sm, padding: space.xl },
  noTripTitle: { ...type.title, color: color.ink },
  noTripBody: { ...type.caption, color: color.muted, textAlign: 'center' },
  action: {
    marginTop: space.sm,
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    backgroundColor: color.ink,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
  },
  actionText: { ...type.body, color: color.paper },
});
