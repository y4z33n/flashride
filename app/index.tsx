import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const { loading } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Step 2: Always go to session-viewer for testing
  // Step 3 will replace this with proper auth-gated routing
  return <Redirect href="/(app)/session-viewer" />;
}
