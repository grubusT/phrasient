import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listPinnedPhrases, unpinPhrase } from '../../db/pinnedPhrases';
import { getPhrasePack } from '../../phrases/loader';
import { SUPPORTED_COUNTRIES } from '../../phrases/languages';
import type { PhraseCategory } from '../../phrases/types';
import { PhraseRow } from '../../components/PhraseRow';
import { color, radius, space, type } from '../../theme';

const LANGUAGES = SUPPORTED_COUNTRIES.map((c) => ({
  code: c.languageCode,
  label: c.countryName,
}));

const CATEGORY_LABELS: Record<PhraseCategory, string> = {
  essentials: 'Essentials',
  ordering: 'Ordering',
  dietary: 'Dietary',
  paying: 'Paying',
  transport: 'Transport',
  directions: 'Directions',
  accommodation: 'Accommodation',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
};

export default function PinbookScreen() {
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState(LANGUAGES[0].code);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const reload = useCallback(() => {
    listPinnedPhrases(language).then((rows) => setPinnedIds(rows.map((r) => r.phrase_id)));
  }, [language]);

  useFocusEffect(reload);

  const pack = getPhrasePack(language);

  const byCategory = useMemo(() => {
    if (!pack) return [];
    const pinned = new Set(pinnedIds);
    const groups = new Map<PhraseCategory, typeof pack.phrases>();
    for (const phrase of pack.phrases) {
      if (!pinned.has(phrase.id)) continue;
      const group = groups.get(phrase.category);
      if (group) group.push(phrase);
      else groups.set(phrase.category, [phrase]);
    }
    return [...groups.entries()];
  }, [pack, pinnedIds]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.lg }]}>
      <Text style={styles.heading}>Pinbook</Text>

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

      <ScrollView contentContainerStyle={styles.list}>
        {byCategory.length === 0 ? (
          <Text style={styles.empty}>
            Save a phrase from a pin or a move and it will wait for you here.
          </Text>
        ) : (
          byCategory.map(([category, phrases]) => (
            <View key={category} style={styles.group}>
              <Text style={styles.groupTitle}>{CATEGORY_LABELS[category]}</Text>
              {phrases.map((phrase) => (
                <PhraseRow
                  key={phrase.id}
                  phrase={phrase}
                  ttsLocale={pack!.ttsLocale}
                  pinned
                  onTogglePin={async () => {
                    await unpinPhrase(language, phrase.id);
                    reload();
                  }}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.paper, paddingHorizontal: space.lg },
  heading: { ...type.title, color: color.ink, marginBottom: space.lg },
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
  list: { paddingBottom: space.xxl },
  group: { marginBottom: space.lg },
  groupTitle: { ...type.caption, color: color.muted, marginBottom: space.xs },
  empty: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xxl },
});
