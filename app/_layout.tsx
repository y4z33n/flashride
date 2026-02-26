import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '../store/authStore';
import { registerPushToken } from '../lib/notifications';

function isExpoGo() {
  return Constants.executionEnvironment === 'storeClient';
}

export default function RootLayout() {
  const { initialize, session } = useAuthStore();
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const notifListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, []);

  // Register push token once session is available
  useEffect(() => {
    if (session?.user?.id) {
      registerPushToken(session.user.id);
    }
  }, [session?.user?.id]);

  // Handle notification tap — navigate to the relevant screen
  useEffect(() => {
    if (isExpoGo()) return; // Not supported in Expo Go SDK 53+

    // Lazy import to avoid module-level side effects in Expo Go
    const Notifications = require('expo-notifications');
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as any;
      if (data?.rideId) {
        router.push(`/(app)/ride/${data.rideId}` as any);
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="(app)">
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
