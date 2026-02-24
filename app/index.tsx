import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // For Step 2 testing, always go to session-viewer
  // In Step 3, we'll change this to check session first
  return <Redirect href="/(app)/session-viewer" />;
}
