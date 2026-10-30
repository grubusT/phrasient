import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SUPPORTED_COUNTRIES } from '../phrases/languages';
import { getPhrasePack } from '../phrases/loader';
import { searchPhrases } from '../phrases/search';
import { PillPicker } from '../components/PillPicker';
import { PhraseRow } from '../components/PhraseRow';
import { UnreviewedPackWarning } from '../components/UnreviewedPackWarning';
import { usePinnedPhrases } from '../components/usePinnedPhrases';
import { color, radius, space, type } from '../theme';

const LANGUAGES = SUPPORTED_COUNTRIES.map((c) => ({ value: c.languageCode, label: c.countryName }));

export default function SearchScreen() {
  const { languageCode } = useLocalSearchParams<{ languageCode?: string }>();
  const router = useRouter();
  const [language, setLanguage] = useState(languageCode ?? LANGUAGES[0].value);
  const [query, setQuery] = useState('');
  const { pinnedIds, toggle } = usePinnedPhrases(language);

  const pack = getPhrasePack(language);
  const results = useMemo(() => (pack ? searchPhrases(pack, query) : []), [pack, query]);

  return (
    <View style={styles.root}>
      <PillPicker
        options={LANGUAGES}
        value={language}
        onChange={setLanguage}
        accessibilityLabel="Language"
      />

      {pack && <UnreviewedPackWarning pack={pack} />}

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search phrases"
        placeholderTextColor={color.muted}
        autoCapitalize="none"
      />

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query ? <Text style={styles.empty}>Nothing matches “{query}”.</Text> : undefined
        }
        renderItem={({ item }) => (
          <PhraseRow
            phrase={item}
            ttsLocale={pack!.ttsLocale}
            pinned={pinnedIds.has(item.id)}
            onTogglePin={() => toggle(item.id)}
            onPress={() =>
              router.push({
                pathname: '/phrase/[languageCode]/[phraseId]',
                params: { languageCode: language, phraseId: item.id },
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, padding: space.lg, gap: space.sm },
  input: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    color: color.ink,
  },
  list: { flexGrow: 1, paddingBottom: space.xxl },
  empty: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xxl },
});
