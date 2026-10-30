import { useLocalSearchParams } from 'expo-router';
import { getPhrasePack } from '../../../phrases/loader';
import { HoldUpScreen } from '../../../components/HoldUpScreen';

/** One phrase, full screen, to hold up to someone. */
export default function PhraseScreen() {
  const { languageCode, phraseId } = useLocalSearchParams<{ languageCode: string; phraseId: string }>();
  const phrase = getPhrasePack(languageCode)?.phrases.find((p) => p.id === phraseId);
  if (!phrase) return null;

  return <HoldUpScreen primary={phrase.target} caption={phrase.english} />;
}
