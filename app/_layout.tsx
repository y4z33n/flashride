import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { initialize, setLoading } = useAuthStore();

  useEffect(() => {
    // Ensure loading is true while we initialize
    setLoading(true);
    initialize();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
