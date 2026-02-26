import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../lib/auth';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/Button';
import { validate, firstError } from '../../lib/validation';

export default function LoginScreen() {
  const router = useRouter();
  const { initialize } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const handleSubmit = async () => {
    const err = firstError(
      validate.email(email),
      validate.password(password),
    );
    if (err) { Alert.alert('Invalid Input', err); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await authService.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (data.user && !data.session) {
          Alert.alert('Check your email', 'We sent a confirmation link to ' + email.trim());
          return;
        }
        if (data.session) {
          await initialize();
          router.replace('/(auth)/profile-setup');
        }
      } else {
        const { data, error } = await authService.signIn({ email: email.trim(), password });
        if (error) throw error;
        if (data.session) {
          await initialize();
          const { data: profile } = await import('../../lib/auth').then(m =>
            m.authService.getProfile(data.session!.user.id)
          );
          if (profile) {
            router.replace('/(app)/home');
          } else {
            router.replace('/(auth)/profile-setup');
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.title}>FlashRide</Text>
          <Text style={styles.subtitle}>Mauritius Carpooling</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholderTextColor="#999"
          />

          <Button
            label={mode === 'signin' ? 'Sign In' : 'Sign Up'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 4 }}
          />

          <TouchableOpacity
            style={styles.switchMode}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={styles.switchModeText}>
              {mode === 'signin'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#111' },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fafafa',
    color: '#111',
  },
  switchMode: { alignItems: 'center', marginTop: 20 },
  switchModeText: { color: '#007AFF', fontSize: 15 },
});
