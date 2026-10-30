import { Pressable, StyleSheet, Text } from 'react-native';
import type { Pin } from '../../db/types';
import { color, space, type } from '../../theme';

interface Props {
  from: Pin;
  fromNumber: number;
  onPress: () => void;
}

/** The gap above a pin: tapping it opens what to say getting there from the pin before. */
export function MoveRow({ from, fromNumber, onPress }: Props) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Phrases for getting here from ${fromNumber}. ${from.display_name}`}
    >
      <Text style={styles.text} numberOfLines={1}>
        From {fromNumber}. {from.display_name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    // Lines up with the text column of the pin row below it.
    paddingLeft: space.xl,
    paddingRight: space.sm,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: color.hairline,
    marginLeft: space.xl,
  },
  text: { ...type.caption, color: color.muted },
});
