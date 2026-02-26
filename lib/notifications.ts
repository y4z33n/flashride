import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Detect if running inside Expo Go (storeClient).
 * expo-notifications remote push is NOT supported in Expo Go SDK 53+.
 */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Set the foreground notification handler.
 * Only called in non-Expo-Go environments.
 */
function setupHandler() {
  if (isExpoGo()) return;
  // Lazy import to avoid the module-level side effects in Expo Go
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

setupHandler();

/**
 * Request permission and register the Expo push token with Supabase.
 * Silently skips in Expo Go (remote push removed in SDK 53).
 */
export async function registerPushToken(userId: string): Promise<void> {
  if (isExpoGo()) return;

  const Device = require('expo-device');
  if (!Device.isDevice) return;

  const Notifications = require('expo-notifications');

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

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

    if (!projectId) {
      console.warn('[Notifications] No EAS projectId — skipping token registration.');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS as 'ios' | 'android' | 'web' },
      { onConflict: 'user_id,token' }
    );
  } catch (err) {
    console.warn('[Notifications] Token registration failed:', err);
  }
}

/**
 * Send a push notification via Supabase Edge Function (server-side, secure).
 * The Edge Function holds the service-role key — push tokens are never
 * fetched or readable client-side.
 */
export async function sendPushNotification(
  toUserId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-push', {
      body: { userId: toUserId, title, body, data: data ?? {} },
    });
    if (error) throw error;
  } catch (err) {
    console.warn('Failed to send push notification:', err);
  }
}

