import { Pressable, StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { useReorderableDrag } from 'react-native-reorderable-list';
import type { Pin } from '../../db/types';
import { NumberedPin } from '../map/NumberedPin';
import { color, radius, space, type } from '../../theme';

interface Props {
  pin: Pin;
  number: number;
  selected: boolean;
  onPress: () => void;
  /** Moves the pin one row earlier or later, crossing into the next day at the edges. */
  onStep: (direction: -1 | 1) => void;
  onFindOnMap: () => void;
}

const STEP_ACTIONS = [
  { name: 'earlier', label: 'Move earlier' },
  { name: 'later', label: 'Move later' },
];

/** A pin in the sheet's day list. Long-press and drag to reorder or change day. */
export function PinRow({ pin, number, selected, onPress, onStep, onFindOnMap }: Props) {
  const drag = useReorderableDrag();
  const unplaced = pin.lat === null || pin.lng === null;

  // Drag is not available to screen readers, so the same move is offered as actions.
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'earlier') onStep(-1);
    if (e.nativeEvent.actionName === 'later') onStep(1);
  };

  return (
    <Pressable
      style={[styles.row, selected && styles.selected]}
      onPress={onPress}
      onLongPress={drag}
      delayLongPress={250}
      accessibilityRole="button"
      accessibilityLabel={`${number}. ${pin.display_name}`}
      accessibilityHint="Long-press and drag to reorder"
      accessibilityActions={STEP_ACTIONS}
      onAccessibilityAction={onAccessibilityAction}
    >
      <NumberedPin number={number} selected={selected} />
      <View style={styles.text}>
        <Text style={styles.name}>{pin.display_name}</Text>
        {pin.official_name && <Text style={styles.script}>{pin.official_name}</Text>}
        {unplaced && <Text style={styles.caption}>Not on the map yet</Text>}
      </View>
      {unplaced && (
        <Pressable
          style={styles.find}
          onPress={onFindOnMap}
          accessibilityRole="button"
          accessibilityLabel={`Find ${pin.display_name} on the map`}
        >
          <Text style={styles.findText}>Find on map</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: space.xxl + space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: color.paper,
  },
  selected: { backgroundColor: color.wash },
  text: { flex: 1 },
  name: { ...type.body, color: color.ink },
  script: { ...type.script, color: color.ink },
  caption: { ...type.caption, color: color.muted },
  find: {
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
  },
  findText: { ...type.caption, color: color.ink },
});
