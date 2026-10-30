import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Trips' }} />
        <Stack.Screen name="trips/new" options={{ title: 'New Trip', presentation: 'modal' }} />
        <Stack.Screen name="trips/[tripId]/index" options={{ title: 'Day' }} />
        <Stack.Screen
          name="trips/[tripId]/stop/new"
          options={{ title: 'Add Stop', presentation: 'modal' }}
        />
        <Stack.Screen name="trips/[tripId]/stop/[stopId]" options={{ title: 'Stop' }} />
        <Stack.Screen
          name="show-driver/[stopId]"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen name="search" options={{ title: 'Search Phrases' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
