import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View, type ScrollViewProps } from 'react-native';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetScrollableCreator,
  useBottomSheetSpringConfigs,
} from '@gorhom/bottom-sheet';
import ReorderableList, { type ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { scheduleOnRN } from 'react-native-worklets';
import type { Pin, Trip } from '../../db/types';
import { currentOrNextPin, dropTarget, previousPin, sheetRows, type SheetRow } from '../../lib/trip';
import { formatDisplayDate, nowHHMM, todayISO } from '../../lib/date';
import { PeekCard } from './PeekCard';
import { PinRow } from './PinRow';
import { MoveRow } from './MoveRow';
import { PinDetailView } from '../detail/PinDetailView';
import { MoveCard } from '../detail/MoveCard';
import { color, motion, radius, space, type } from '../../theme';

interface Props {
  trip: Trip | null;
  pins: Pin[];
  numbers: Map<number, number>;
  selectedPinId: number | null;
  onSelectPin: (pin: Pin) => void;
  onMovePin: (pinId: number, day: string, index: number) => void;
  onFindOnMap: (pin: Pin) => void;
  onEditPin: (pin: Pin) => void;
  onGoToTrips: () => void;
}

/**
 * What the sheet shows instead of the day list: a pin's detail, or the move
 * into a pin from the one before it. Both are keyed by the pin they end at.
 */
type Detail = { kind: 'pin' | 'move'; pinId: number };

// @gorhom/bottom-sheet's default handle height; the peek snap is this plus the card.
const HANDLE_HEIGHT = 24;

/**
 * The map's bottom sheet. Peek shows one pin; half and full show the trip day
 * by day. Pins are reordered, and moved between days, by dragging them past
 * the day headers. Tapping a pin or the move above it swaps the list for that
 * pin's detail or move card.
 */
export function TripSheet({
  trip,
  pins,
  numbers,
  selectedPinId,
  onSelectPin,
  onMovePin,
  onFindOnMap,
  onEditPin,
  onGoToTrips,
}: Props) {
  const sheet = useRef<BottomSheet>(null);
  const [peekHeight, setPeekHeight] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const snapPoints = useMemo(
    () => [Math.max(peekHeight, space.xxl * 2) + HANDLE_HEIGHT, '50%', '92%'],
    [peekHeight]
  );
  const renderScrollComponent = useBottomSheetScrollableCreator<ScrollViewProps>();
  const animationConfigs = useBottomSheetSpringConfigs(motion.sheetSpring);

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

  // Selecting another pin on the map, or tapping empty map, closes the detail.
  // Adjusted during render rather than in an effect, so it never paints stale.
  if (detail && detail.pinId !== selectedPinId) setDetail(null);
  const detailPin = detail ? pins.find((p) => p.id === detail.pinId) : undefined;
  const detailFrom = detail?.kind === 'move' && detailPin ? previousPin(pins, detailPin.id) : null;

  const openDetail = useCallback(
    (kind: Detail['kind'], pin: Pin) => {
      onSelectPin(pin);
      setDetail({ kind, pinId: pin.id });
      sheet.current?.snapToIndex(1);
    },
    [onSelectPin]
  );

  // Android back leaves the detail before it leaves the screen.
  useEffect(() => {
    if (!detail) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setDetail(null);
      return true;
    });
    return () => sub.remove();
  }, [detail]);

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
    // The move line lives inside the pin's cell, not as a row of its own, so
    // drag targets and step actions count only days and pins. It is hidden
    // mid-drag because it would travel with the pin and name the wrong origin.
    const from = dragging ? null : previousPin(pins, item.pin.id);
    return (
      <View>
        {from && (
          <MoveRow
            from={from}
            fromNumber={numbers.get(from.id) ?? 0}
            onPress={() => openDetail('move', item.pin)}
          />
        )}
        <PinRow
          pin={item.pin}
          number={numbers.get(item.pin.id) ?? 0}
          selected={item.pin.id === selectedPinId}
          onPress={() => openDetail('pin', item.pin)}
          onStep={(direction) => {
            const to = index + direction;
            if (to >= 0 && to < rows.length) move(index, to);
          }}
          onFindOnMap={() => onFindOnMap(item.pin)}
        />
      </View>
    );
  };

  return (
    <BottomSheet
      ref={sheet}
      index={0}
      snapPoints={snapPoints}
      animationConfigs={animationConfigs}
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
      ) : detailPin ? (
        <BottomSheetScrollView contentContainerStyle={styles.detail}>
          <Pressable
            style={styles.back}
            onPress={() => setDetail(null)}
            accessibilityRole="button"
            accessibilityLabel={`Back to ${trip.name}`}
          >
            <Text style={styles.backText}>‹ {trip.name}</Text>
          </Pressable>
          {detail?.kind === 'move' && detailFrom ? (
            <MoveCard
              from={detailFrom}
              to={detailPin}
              fromNumber={numbers.get(detailFrom.id) ?? 0}
              toNumber={numbers.get(detailPin.id) ?? 0}
            />
          ) : (
            <PinDetailView
              pin={detailPin}
              number={numbers.get(detailPin.id) ?? 0}
              onEdit={() => onEditPin(detailPin)}
              onFindOnMap={() => onFindOnMap(detailPin)}
            />
          )}
        </BottomSheetScrollView>
      ) : (
        <View style={styles.content}>
          <Pressable
            style={styles.peek}
            onLayout={(e) => setPeekHeight(e.nativeEvent.layout.height)}
            onPress={peekPin ? () => openDetail('pin', peekPin) : undefined}
            disabled={!peekPin}
            accessibilityRole="button"
            accessibilityHint="Opens this place's phrases"
          >
            <PeekCard
              pin={peekPin}
              number={peekPin ? numbers.get(peekPin.id) ?? 0 : 0}
              caption={peekCaption}
            />
          </Pressable>
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
  detail: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  back: { minHeight: space.xxl + space.md, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { ...type.body, color: color.muted },
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
