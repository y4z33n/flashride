import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { session, profile, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {profile ? (
          <>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{profile.full_name}</Text>
            <Text style={styles.email}>{profile.email}</Text>

            <View style={styles.section}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>📞 Phone</Text>
                <Text style={styles.rowValue}>{profile.phone || 'Not set'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>⭐ Rating</Text>
                <Text style={styles.rowValue}>
                  {profile.rating_avg > 0 ? `${profile.rating_avg} (${profile.rating_count} reviews)` : 'No ratings yet'}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>🚗 Driver</Text>
                <Text style={styles.rowValue}>{profile.is_driver ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>📅 Joined</Text>
                <Text style={styles.rowValue}>
                  {new Date(profile.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/(auth)/profile-setup')}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.noProfile}>
            <Text style={styles.noProfileText}>No profile found</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/(auth)/profile-setup')}
            >
              <Text style={styles.editButtonText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 36, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#111' },
  email: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 15, color: '#444' },
  rowValue: { fontSize: 15, color: '#111', fontWeight: '500' },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  noProfile: { alignItems: 'center', padding: 20 },
  noProfileText: { fontSize: 16, color: '#666', marginBottom: 16 },
  logoutButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ff3b30',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
});
