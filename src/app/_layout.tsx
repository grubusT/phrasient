import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/client';
import { color, space, type } from '../theme';

export default function RootLayout() {
  // Nothing may read the database before migrations have run, so the whole app
  // waits behind this gate rather than each screen guarding for itself.
  const [state, setState] = useState<'migrating' | 'ready' | 'failed'>('migrating');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDb().then(
      () => setState('ready'),
      (e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setState('failed');
      }
    );
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {state === 'ready' ? (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="show-driver/[pinId]"
              options={{ presentation: 'fullScreenModal' }}
            />
          </Stack>
        ) : (
          <View style={styles.gate}>
            {state === 'migrating' ? (
              <ActivityIndicator color={color.muted} />
            ) : (
              <>
                <Text style={styles.failedTitle}>Your trips could not be opened</Text>
                <Text style={styles.failedBody}>{error}</Text>
              </>
            )}
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.paper,
    padding: space.xl,
    gap: space.sm,
  },
  failedTitle: { ...type.title, color: color.ink },
  failedBody: { ...type.caption, color: color.muted, textAlign: 'center' },
});
