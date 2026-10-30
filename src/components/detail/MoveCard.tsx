import { StyleSheet, Text, View } from 'react-native';
import type { Pin } from '../../db/types';
import { countryName, languageForCountry } from '../../phrases/languages';
import { getPhrasePack } from '../../phrases/loader';
import { phrasesForMove } from '../../phrases/resolve';
import { NumberedPin } from '../map/NumberedPin';
import { AddressCard } from './AddressCard';
import { PhraseList } from './PhraseList';
import { color, space, type } from '../../theme';

interface Props {
  from: Pin;
  to: Pin;
  fromNumber: number;
  toNumber: number;
}

/**
 * What you say GETTING from one pin to the next, in the destination's language.
 * No route, time or mode: just the destination's driver card and the phrases
 * for the ride. None of them repeat the destination's pin detail.
 */
export function MoveCard({ from, to, fromNumber, toNumber }: Props) {
  const languageCode = languageForCountry(to.country_code);
  const pack = languageCode ? getPhrasePack(languageCode) : null;

  return (
    <View style={styles.root}>
      <View style={styles.ends}>
        <View style={styles.end}>
          <NumberedPin number={fromNumber} />
          <Text style={styles.endName} numberOfLines={2}>
            <Text style={styles.caption}>From </Text>
            {from.display_name}
          </Text>
        </View>
        <View style={styles.end}>
          <NumberedPin number={toNumber} />
          <Text style={styles.endName} numberOfLines={2}>
            <Text style={styles.caption}>To </Text>
            {to.display_name}
          </Text>
        </View>
      </View>

      <AddressCard pin={to} />

      {pack ? (
        <PhraseList pack={pack} phrases={phrasesForMove(pack, from.stop_type, to.stop_type)} title="Getting there" />
      ) : (
        <Text style={styles.caption}>No phrases for {countryName(to.country_code)} yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  ends: { gap: space.sm },
  end: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  endName: { ...type.body, color: color.ink, flex: 1 },
  caption: { ...type.caption, color: color.muted },
});
