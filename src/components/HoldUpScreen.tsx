import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, space, type } from '../theme';

interface Props {
  /** The local-script line, as large as it will go. */
  primary: string;
  /** More local script under it, still readable at arm's length. */
  secondary?: string | null;
  /** English, small, for the user rather than the reader. */
  caption?: string | null;
}

/**
 * Held up for someone else to read: a driver, a shopkeeper, a stranger. The
 * screen stays awake and shows one thing as large as it will go.
 */
export function HoldUpScreen({ primary, secondary, caption }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useKeepAwake();

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Pressable
        style={[styles.close, { top: insets.top + space.md }]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Text style={styles.closeIcon}>✕</Text>
      </Pressable>
      <Text style={styles.primary} adjustsFontSizeToFit numberOfLines={6} minimumFontScale={0.4}>
        {primary}
      </Text>
      {secondary ? (
        <Text style={styles.secondary} adjustsFontSizeToFit numberOfLines={3} minimumFontScale={0.5}>
          {secondary}
        </Text>
      ) : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.driverGround,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  close: {
    position: 'absolute',
    right: space.xl,
    width: space.xxl + space.md,
    height: space.xxl + space.md,
    borderRadius: radius.pill,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { ...type.title, color: color.driverInk },
  primary: { ...type.driver, color: color.driverInk, textAlign: 'center' },
  secondary: { ...type.script, color: color.driverInk, marginTop: space.xl, textAlign: 'center' },
  caption: { ...type.body, color: color.muted, marginTop: space.xl, textAlign: 'center' },
});
