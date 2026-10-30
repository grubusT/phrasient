import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listPinnedPhrases, pinPhrase, unpinPhrase } from '../db/pinnedPhrases';
import { SUPPORTED_COUNTRIES } from '../phrases/languages';
import { getPhrasePack } from '../phrases/loader';
import { searchPhrases } from '../phrases/search';
import { PhraseRow } from '../components/PhraseRow';
import { color, radius, space, type } from '../theme';

const LANGUAGES = SUPPORTED_COUNTRIES.map((c) => ({ code: c.languageCode, label: c.countryName }));

export default function SearchScreen() {
  const { languageCode } = useLocalSearchParams<{ languageCode?: string }>();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState(languageCode ?? LANGUAGES[0].code);
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const reloadPinned = useCallback(() => {
    listPinnedPhrases(language).then((rows) => setPinnedIds(new Set(rows.map((r) => r.phrase_id))));
  }, [language]);

  useFocusEffect(reloadPinned);

  const pack = getPhrasePack(language);
  const results = useMemo(() => (pack ? searchPhrases(pack, query) : []), [pack, query]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.lg }]}>
      <View style={styles.languageRow}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.pill, language === l.code && styles.pillSelected]}
            onPress={() => setLanguage(l.code)}
          >
            <Text style={[styles.pillText, language === l.code && styles.pillTextSelected]}>
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>

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
            onTogglePin={async () => {
              if (pinnedIds.has(item.id)) await unpinPhrase(language, item.id);
              else await pinPhrase(language, item.id);
              reloadPinned();
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.lg },
  languageRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  pill: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
  },
  pillSelected: { backgroundColor: color.ink },
  pillText: { ...type.caption, color: color.ink },
  pillTextSelected: { color: color.paper },
  input: {
    borderWidth: 1,
    borderColor: color.hairline,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    ...type.body,
    color: color.ink,
    marginBottom: space.sm,
  },
  list: { flexGrow: 1, paddingBottom: space.xxl },
  empty: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xxl },
});
