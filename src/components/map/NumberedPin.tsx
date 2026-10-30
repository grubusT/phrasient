import { StyleSheet, Text, View } from 'react-native';
import { color, radius } from '../../theme';

interface Props {
  number: number;
  selected?: boolean;
}

/**
 * The only saturated element on the map. A numbered disc rather than a teardrop:
 * the number is the content, so it gets the whole shape.
 */
export function NumberedPin({ number, selected = false }: Props) {
  return (
    <View style={[styles.pin, selected && styles.pinSelected]}>
      <Text style={[styles.number, selected && styles.numberSelected]}>{number}</Text>
    </View>
  );
}

const SIZE = 28;

const styles = StyleSheet.create({
  pin: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    backgroundColor: color.lacquer,
    borderWidth: 2,
    borderColor: color.onLacquer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSelected: {
    backgroundColor: color.ink,
    transform: [{ scale: 1.15 }],
  },
  number: {
    color: color.onLacquer,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  numberSelected: { color: color.onLacquer },
});
