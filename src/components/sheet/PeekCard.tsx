import { StyleSheet, Text, View } from 'react-native';
import type { Pin } from '../../db/types';
import { NumberedPin } from '../map/NumberedPin';
import { color, space, type } from '../../theme';

interface Props {
  pin: Pin | null;
  number: number;
  /** Shown under the name: the pin's day, or that it is not on the map yet. */
  caption: string;
}

/**
 * What the sheet shows at its lowest snap: the selected pin, else the current
 * or next one. The local-script name is the line you would show someone.
 */
export function PeekCard({ pin, number, caption }: Props) {
  if (!pin) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Search for a place or long-press the map to drop your first pin.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <NumberedPin number={number} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {pin.display_name}
        </Text>
        {pin.official_name && (
          <Text style={styles.script} numberOfLines={1}>
            {pin.official_name}
          </Text>
        )}
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  text: { flex: 1 },
  name: { ...type.body, color: color.ink },
  script: { ...type.script, color: color.ink },
  caption: { ...type.caption, color: color.muted },
  empty: { ...type.caption, color: color.muted, flex: 1 },
});
