import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';

interface Props<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/** A single choice from a short list, as wrapping pills. */
export function PillPicker<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => onChange(option.value)}
            hitSlop={space.xs}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
  },
  pillSelected: { backgroundColor: color.ink },
  pillText: { ...type.caption, color: color.ink },
  pillTextSelected: { color: color.paper },
});
