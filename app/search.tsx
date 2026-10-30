import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getPhrasePack } from '../phrasebook/loader';
import { searchPhrases } from '../phrasebook/search';
import { AudioPlayButton } from '../components/AudioPlayButton';

const LANGUAGES = [
  { code: 'zh-CN', label: 'Chinese' },
  { code: 'vi', label: 'Vietnamese' },
];

export default function SearchScreen() {
  const { languageCode } = useLocalSearchParams<{ languageCode?: string }>();
  const [language, setLanguage] = useState(languageCode ?? LANGUAGES[0].code);
  const [query, setQuery] = useState('');

  const pack = getPhrasePack(language);
  const results = useMemo(() => (pack ? searchPhrases(pack, query) : []), [pack, query]);

  return (
    <View style={styles.container}>
      <View style={styles.langRow}>
        {LANGUAGES.map((l) => (
          <Pressable
            key={l.code}
            style={[styles.langPill, language === l.code && styles.langPillSelected]}
            onPress={() => setLanguage(l.code)}
          >
            <Text style={[styles.langPillText, language === l.code && styles.langPillTextSelected]}>
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search phrases..."
        autoCapitalize="none"
      />

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={query ? <Text style={styles.empty}>No matches.</Text> : undefined}
        renderItem={({ item }) => (
          <View style={styles.phraseRow}>
            <View style={styles.phraseText}>
              <Text style={styles.phraseEnglish}>{item.english}</Text>
              <Text style={styles.phraseTarget}>{item.target}</Text>
              <Text style={styles.phraseRoman}>{item.romanization}</Text>
            </View>
            <AudioPlayButton text={item.target} locale={pack!.ttsLocale} audioPath={item.audio} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  langRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  langPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  langPillSelected: { backgroundColor: '#1a73e8' },
  langPillText: { color: '#333' },
  langPillTextSelected: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  list: { flexGrow: 1 },
  empty: { textAlign: 'center', marginTop: 48, color: '#666' },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  phraseText: { flex: 1 },
  phraseEnglish: { fontSize: 14, color: '#666' },
  phraseTarget: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  phraseRoman: { fontSize: 13, color: '#888', marginTop: 1 },
});
