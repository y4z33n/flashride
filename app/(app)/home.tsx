import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';

export default function HomeScreen() {
  const { profile, session } = useAuthStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.greeting}>
          👋 Hello, {profile?.full_name?.split(' ')[0] ?? 'Rider'}
        </Text>
        <Text style={styles.subtitle}>Where are you going today?</Text>

        <View style={styles.quickActions}>
          <View style={styles.actionCard}>
            <Text style={styles.actionEmoji}>🔍</Text>
            <Text style={styles.actionTitle}>Find a Ride</Text>
            <Text style={styles.actionDesc}>Search available rides near you</Text>
          </View>
          <View style={styles.actionCard}>
            <Text style={styles.actionEmoji}>🚗</Text>
            <Text style={styles.actionTitle}>Offer a Ride</Text>
            <Text style={styles.actionDesc}>Share your journey & split costs</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Upcoming Rides</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyText}>No upcoming rides</Text>
            <Text style={styles.emptySubtext}>Search for a ride or offer one!</Text>
          </View>
        </View>

        {/* Debug info - remove in Step 4 */}
        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>✅ Auth Active</Text>
          <Text style={styles.debugText}>User: {session?.user?.email}</Text>
          <Text style={styles.debugText}>Profile: {profile ? 'Loaded' : 'None'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { flex: 1, padding: 20 },
  greeting: { fontSize: 26, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  actionEmoji: { fontSize: 32, marginBottom: 8 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 4 },
  actionDesc: { fontSize: 12, color: '#888', textAlign: 'center' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 12 },
  emptyState: {
    backgroundColor: '#fff', borderRadius: 12, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 4 },
  emptySubtext: { fontSize: 13, color: '#999' },
  debugBox: {
    backgroundColor: '#e8f4fd', borderRadius: 8,
    padding: 12, marginTop: 8,
  },
  debugTitle: { fontSize: 13, fontWeight: '700', color: '#007AFF', marginBottom: 4 },
  debugText: { fontSize: 12, color: '#555', marginBottom: 2 },
});
