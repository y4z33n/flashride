import { Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function AppIndex() {
  const { session, profile } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }
  if (!profile) {
    return <Redirect href="/(auth)/profile-setup" />;
  }
  return <Redirect href="/(app)/home" />;
}
