import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// How notifications behave when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and register the Expo push token with Supabase.
 * Call this once after the user is authenticated.
 */
export async function registerPushToken(userId: string): Promise<void> {
  // Push notifications only work on real devices
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FlashRide',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    // Upsert into push_tokens table
    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS as 'ios' | 'android' | 'web',
      },
      { onConflict: 'user_id,token' }
    );
  } catch (err) {
    console.warn('Push token registration failed:', err);
  }
}

/**
 * Send a push notification via Supabase Edge Function.
 * Falls back to a direct Expo Push API call if no edge function is set up.
 */
export async function sendPushNotification(
  toUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    // Get the target user's push token(s)
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', toUserId);

    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }));

    // Send via Expo Push API
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('Failed to send push notification:', err);
  }
}
