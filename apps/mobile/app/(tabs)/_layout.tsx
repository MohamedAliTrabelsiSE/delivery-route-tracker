import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'left', tabBarActiveTintColor: '#0f766e' }}>
      <Tabs.Screen name="index" options={{ title: 'Driver' }} />
      <Tabs.Screen name="track" options={{ title: 'Track' }} />
      <Tabs.Screen name="pick" options={{ title: 'Pick' }} />
    </Tabs>
  );
}
