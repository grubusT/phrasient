import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AudioPlayButton } from './AudioPlayButton';
import type { Phrase } from '../phrases/types';
import { color, radius, space, type } from '../theme';

interface Props {
  phrase: Phrase;
  ttsLocale: string;
  pinned?: boolean;
  onTogglePin?: () => void;
  /** Opens the phrase full screen, large enough to hold up to someone. */
  onPress?: () => void;
}

/**
 * The script line is the object; English is its caption. That inversion is the
 * app's core type decision and this row is where it is set.
 */
export function PhraseRow({ phrase, ttsLocale, pinned = false, onTogglePin, onPress }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.text} onPress={onPress} disabled={!onPress}>
        <Text style={styles.english}>{phrase.english}</Text>
        <Text style={styles.script}>{phrase.target}</Text>
        <Text style={styles.romanization}>{phrase.romanization}</Text>
      </Pressable>
      <View style={styles.actions}>
        <AudioPlayButton text={phrase.target} locale={ttsLocale} audioPath={phrase.audio} />
        {onTogglePin && (
          <Pressable
            onPress={onTogglePin}
            hitSlop={8}
            style={[styles.pinButton, pinned && styles.pinButtonActive]}
            accessibilityRole="button"
            accessibilityLabel={pinned ? 'Remove from pinbook' : 'Save to pinbook'}
          >
            <Text style={[styles.pinIcon, pinned && styles.pinIconActive]}>
              {pinned ? '★' : '☆'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.hairline,
  },
  text: { flex: 1 },
  english: { ...type.caption, color: color.muted },
  script: { ...type.script, color: color.ink, marginTop: space.xs },
  romanization: { ...type.caption, color: color.muted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xs },
  pinButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonActive: { backgroundColor: color.wash },
  pinIcon: { fontSize: 18, color: color.muted },
  pinIconActive: { color: color.lacquer },
});
