import { StyleSheet, Text } from 'react-native';
import { languageName } from '../phrases/languages';
import type { PhrasePack } from '../phrases/types';
import { color, radius, space, type } from '../theme';

/** Stays on every phrase surface until the pack is marked reviewed. */
export function UnreviewedPackWarning({ pack }: { pack: PhrasePack }) {
  if (pack.reviewed) return null;
  return (
    <Text style={styles.warning}>
      Phrases for {languageName(pack.language)} have not yet been reviewed by a native speaker.
    </Text>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...type.caption,
    color: color.warningInk,
    backgroundColor: color.warningGround,
    borderRadius: radius.sm,
    padding: space.md,
  },
});
