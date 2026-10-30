import { Tabs } from 'expo-router';
import { color } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: { backgroundColor: color.paper, borderTopColor: color.hairline },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="pinbook" options={{ title: 'Pinbook' }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips' }} />
    </Tabs>
  );
}
