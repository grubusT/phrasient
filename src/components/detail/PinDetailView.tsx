import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Pin } from '../../db/types';
import { countryName, languageForCountry } from '../../phrases/languages';
import { getPhrasePack } from '../../phrases/loader';
import { phrasesForPin } from '../../phrases/resolve';
import { NumberedPin } from '../map/NumberedPin';
import { STOP_TYPE_LABELS } from '../stopTypeLabels';
import { AddressCard } from './AddressCard';
import { PhraseList } from './PhraseList';
import { color, radius, space, type } from '../../theme';

interface Props {
  pin: Pin;
  number: number;
  onEdit: () => void;
  onFindOnMap: () => void;
}

/** What you say AT a place: its address for the driver, then its phrases. */
export function PinDetailView({ pin, number, onEdit, onFindOnMap }: Props) {
  const languageCode = languageForCountry(pin.country_code);
  const pack = languageCode ? getPhrasePack(languageCode) : null;
  const unplaced = pin.lat === null || pin.lng === null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <NumberedPin number={number} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{pin.display_name}</Text>
          {pin.official_name && <Text style={styles.script}>{pin.official_name}</Text>}
          <Text style={styles.caption}>{STOP_TYPE_LABELS[pin.stop_type]}</Text>
        </View>
        <Pressable
          style={styles.pillButton}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${pin.display_name}`}
        >
          <Text style={styles.pillText}>Edit</Text>
        </Pressable>
      </View>

      {unplaced && (
        <Pressable
          style={[styles.pillButton, styles.find]}
          onPress={onFindOnMap}
          accessibilityRole="button"
          accessibilityLabel={`Find ${pin.display_name} on the map`}
        >
          <Text style={styles.pillText}>Not on the map yet. Find on map</Text>
        </Pressable>
      )}

      <AddressCard pin={pin} />

      {pack ? (
        <PhraseList pack={pack} phrases={phrasesForPin(pack, pin.stop_type)} title="Useful here" />
      ) : (
        <Text style={styles.caption}>No phrases for {countryName(pin.country_code)} yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  headerText: { flex: 1 },
  name: { ...type.title, color: color.ink },
  script: { ...type.script, color: color.ink },
  caption: { ...type.caption, color: color.muted },
  pillButton: {
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
  },
  find: { alignSelf: 'flex-start' },
  pillText: { ...type.caption, color: color.ink },
});
