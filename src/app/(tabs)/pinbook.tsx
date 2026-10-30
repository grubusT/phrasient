import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPhrasePack } from '../../phrases/loader';
import { SUPPORTED_COUNTRIES } from '../../phrases/languages';
import type { PhraseCategory } from '../../phrases/types';
import { PillPicker } from '../../components/PillPicker';
import { PhraseRow } from '../../components/PhraseRow';
import { UnreviewedPackWarning } from '../../components/UnreviewedPackWarning';
import { usePinnedPhrases } from '../../components/usePinnedPhrases';
import { color, radius, space, type } from '../../theme';

const LANGUAGES = SUPPORTED_COUNTRIES.map((c) => ({ value: c.languageCode, label: c.countryName }));

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [language, setLanguage] = useState(LANGUAGES[0].value);
  const { pinnedIds, toggle } = usePinnedPhrases(language);

  const pack = getPhrasePack(language);

  const byCategory = useMemo(() => {
    if (!pack) return [];
    const groups = new Map<PhraseCategory, typeof pack.phrases>();
    for (const phrase of pack.phrases) {
      if (!pinnedIds.has(phrase.id)) continue;
      const group = groups.get(phrase.category);
      if (group) group.push(phrase);
      else groups.set(phrase.category, [phrase]);
    }
    return [...groups.entries()];
  }, [pack, pinnedIds]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.lg }]}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Pinbook</Text>
        <Pressable
          style={styles.searchButton}
          onPress={() => router.push({ pathname: '/search', params: { languageCode: language } })}
          accessibilityRole="button"
        >
          <Text style={styles.pillText}>Search phrases</Text>
        </Pressable>
      </View>

      <PillPicker
        options={LANGUAGES}
        value={language}
        onChange={setLanguage}
        accessibilityLabel="Language"
      />

      <ScrollView contentContainerStyle={styles.list}>
        {pack && <UnreviewedPackWarning pack={pack} />}
        {byCategory.length === 0 ? (
          <Text style={styles.empty}>
            Save a phrase from a pin or a move and it will wait for you here.
          </Text>
        ) : (
          byCategory.map(([category, phrases]) => (
            <View key={category}>
              <Text style={styles.groupTitle}>{CATEGORY_LABELS[category]}</Text>
              {phrases.map((phrase) => (
                <PhraseRow
                  key={phrase.id}
                  phrase={phrase}
                  ttsLocale={pack!.ttsLocale}
                  pinned
                  onTogglePin={() => toggle(phrase.id)}
                  onPress={() =>
                    router.push({
                      pathname: '/phrase/[languageCode]/[phraseId]',
                      params: { languageCode: language, phraseId: phrase.id },
                    })
                  }
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.lg,
  },
  heading: { ...type.title, color: color.ink },
  searchButton: {
    minHeight: space.xxl + space.md,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: color.wash,
  },
  pillText: { ...type.caption, color: color.ink },
  list: { paddingTop: space.md, paddingBottom: space.xxl, gap: space.lg },
  groupTitle: { ...type.caption, color: color.muted, marginBottom: space.xs },
  empty: { ...type.caption, color: color.muted, textAlign: 'center', marginTop: space.xxl },
});
