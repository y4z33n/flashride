// Shim for expo-notifications on web.
// expo-notifications requires native modules not available on web.

export function setNotificationHandler() {}
export function getPermissionsAsync() { return Promise.resolve({ status: 'undetermined' }); }
export function requestPermissionsAsync() { return Promise.resolve({ status: 'denied' }); }
export function getExpoPushTokenAsync() { return Promise.resolve({ data: '' }); }
export function setNotificationChannelAsync() { return Promise.resolve(null); }
export function addNotificationResponseReceivedListener() { return { remove: () => {} }; }
export function addNotificationReceivedListener() { return { remove: () => {} }; }
export function removeNotificationSubscription() {}
export const AndroidImportance = { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 };
