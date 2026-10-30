import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDisplayDate } from '../lib/date';
import { color, radius, space, type } from '../theme';

interface Props {
  days: string[];
  value: string;
  onChange: (day: string) => void;
}

/** Steps through a trip's days, labelled by number and date. */
export function DayStepper({ days, value, onChange }: Props) {
  const index = Math.max(0, days.indexOf(value));
  const step = (delta: number) => onChange(days[index + delta]);

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, index === 0 && styles.disabled]}
        onPress={() => step(-1)}
        disabled={index === 0}
        accessibilityRole="button"
        accessibilityLabel="Previous day"
      >
        <Text style={styles.arrow}>‹</Text>
      </Pressable>
      <View style={styles.label}>
        <Text style={styles.day}>Day {index + 1}</Text>
        <Text style={styles.date}>{formatDisplayDate(days[index])}</Text>
      </View>
      <Pressable
        style={[styles.button, index === days.length - 1 && styles.disabled]}
        onPress={() => step(1)}
        disabled={index === days.length - 1}
        accessibilityRole="button"
        accessibilityLabel="Next day"
      >
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  button: {
    width: space.xxl + space.md,
    height: space.xxl + space.md,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  arrow: { ...type.title, color: color.ink },
  label: { flex: 1, alignItems: 'center' },
  day: { ...type.body, color: color.ink },
  date: { ...type.caption, color: color.muted },
});
