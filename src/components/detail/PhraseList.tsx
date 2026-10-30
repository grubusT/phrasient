import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { floatPinned } from '../../phrases/resolve';
import type { Phrase, PhrasePack } from '../../phrases/types';
import { PhraseRow } from '../PhraseRow';
import { UnreviewedPackWarning } from '../UnreviewedPackWarning';
import { usePinnedPhrases } from '../usePinnedPhrases';
import { color, space, type } from '../../theme';

interface Props {
  pack: PhrasePack;
  phrases: Phrase[];
  title: string;
}

/**
 * A surface's phrases, with the ones already in the pinbook floated above the
 * rest. Tapping a phrase opens it full screen to hold up to someone.
 */
export function PhraseList({ pack, phrases, title }: Props) {
  const router = useRouter();
  const { pinnedIds, toggle } = usePinnedPhrases(pack.language);
  const { pinned, rest } = floatPinned(phrases, pinnedIds);

  const row = (phrase: Phrase) => (
    <PhraseRow
      key={phrase.id}
      phrase={phrase}
      ttsLocale={pack.ttsLocale}
      pinned={pinnedIds.has(phrase.id)}
      onTogglePin={() => toggle(phrase.id)}
      onPress={() =>
        router.push({
          pathname: '/phrase/[languageCode]/[phraseId]',
          params: { languageCode: pack.language, phraseId: phrase.id },
        })
      }
    />
  );

  return (
    <View style={styles.root}>
      <UnreviewedPackWarning pack={pack} />
      {pinned.length > 0 && (
        <View>
          <Text style={styles.title}>From your pinbook</Text>
          {pinned.map(row)}
        </View>
      )}
      {rest.length > 0 && (
        <View>
          <Text style={styles.title}>{title}</Text>
          {rest.map(row)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.lg },
  title: { ...type.body, color: color.ink, fontWeight: type.title.fontWeight },
});
