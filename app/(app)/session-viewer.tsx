import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

export default function SessionViewerScreen() {
  const { session, profile, loading } = useAuthStore();
  const [connectionStatus, setConnectionStatus] = useState<string>('Not tested');

  const testConnection = async () => {
    setConnectionStatus('Testing...');
    try {
      const { data, error } = await supabase.from('profiles').select('count');
      if (error) {
        setConnectionStatus(`❌ Error: ${error.message}`);
      } else {
        setConnectionStatus('✅ Connected to Supabase!');
      }
    } catch (error: any) {
      setConnectionStatus(`❌ Connection failed: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>🔌 Session Viewer</Text>
        <Text style={styles.subtitle}>Supabase Connection Test</Text>

        {/* Connection Test */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <TouchableOpacity style={styles.button} onPress={testConnection}>
            <Text style={styles.buttonText}>Test Supabase Connection</Text>
          </TouchableOpacity>
          <Text style={styles.status}>{connectionStatus}</Text>
        </View>

        {/* Loading State */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auth Loading State</Text>
          <Text style={styles.value}>{loading ? '⏳ Loading...' : '✅ Ready'}</Text>
        </View>

        {/* Session Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          {session ? (
            <View style={styles.infoBox}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{session.user.id}</Text>
              
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{session.user.email}</Text>
              
              <Text style={styles.label}>Session Expires:</Text>
              <Text style={styles.value}>
                {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}
              </Text>
            </View>
          ) : (
            <Text style={styles.noData}>❌ No active session</Text>
          )}
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          {profile ? (
            <View style={styles.infoBox}>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{profile.full_name}</Text>
              
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{profile.phone}</Text>
              
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>
                {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.noData}>❌ No profile loaded</Text>
          )}
        </View>

        {/* Environment Check */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment Variables</Text>
          <Text style={styles.label}>Supabase URL:</Text>
          <Text style={styles.value}>
            {process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </Text>
          <Text style={styles.label}>Supabase Anon Key:</Text>
          <Text style={styles.value}>
            {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
          </Text>
        </View>

        <Text style={styles.footer}>
          Step 2: Supabase Connection Test
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 2,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});
