import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Pin } from '../../db/types';
import { driverCardText } from '../../lib/driverCard';
import { color, radius, space, type } from '../../theme';

/**
 * A place's address in both scripts, English as the caption above the local
 * line, and the button that hands the local text to a driver. The driver card
 * only ever shows official local-script text, so without it the button is off.
 */
export function AddressCard({ pin }: { pin: Pin }) {
  const router = useRouter();
  const card = driverCardText(pin);
  const english = pin.address_en ?? pin.name_en;

  return (
    <View style={styles.card}>
      {english && <Text style={styles.english}>{english}</Text>}
      {card ? (
        <>
          <Text style={styles.script}>{card.primary}</Text>
          {card.secondary && <Text style={styles.scriptSecondary}>{card.secondary}</Text>}
        </>
      ) : (
        <Text style={styles.missing}>No local-script address for this place yet.</Text>
      )}
      <Pressable
        style={[styles.button, !card && styles.buttonDisabled]}
        onPress={() => router.push({ pathname: '/show-driver/[pinId]', params: { pinId: pin.id } })}
        disabled={!card}
        accessibilityRole="button"
        accessibilityState={{ disabled: !card }}
        accessibilityLabel={card ? 'Show the driver' : 'Show the driver, temporarily unavailable'}
      >
        <Text style={[styles.buttonText, !card && styles.buttonTextDisabled]}>
          {card ? 'Show the driver' : 'Temporarily unavailable'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: color.wash, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  english: { ...type.caption, color: color.muted },
  script: { ...type.script, color: color.ink },
  scriptSecondary: { ...type.body, color: color.ink },
  missing: { ...type.body, color: color.muted },
  button: {
    marginTop: space.md,
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: color.ink,
  },
  buttonDisabled: { backgroundColor: color.hairline },
  buttonText: { ...type.body, color: color.paper, fontWeight: type.title.fontWeight },
  buttonTextDisabled: { color: color.muted },
});
