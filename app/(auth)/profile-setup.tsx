import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView, Switch, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../lib/auth';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { validate, firstError } from '../../lib/validation';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { setProfile, profile } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  // Vehicle fields (only shown when isDriver is true)
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Pre-fill if editing existing profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setIsDriver(profile.is_driver ?? false);
      setAvatarUri(profile.avatar_url ?? null);
    }
  }, [profile]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not signed in');
      // Upload to Supabase Storage: avatars/<userId>/avatar.jpg
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${session.user.id}/avatar.${ext}`;
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: `avatar.${ext}`, type: `image/${ext}` } as any);
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, formData, { upsert: true, contentType: `image/${ext}` });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUri(publicUrl);
      // Save to profile immediately
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session.user.id);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const err = firstError(
      validate.fullName(fullName),
      validate.phone(phone),
      ...(isDriver ? [
        validate.vehicleText(vehicleMake, 'Vehicle make'),
        validate.vehicleText(vehicleModel, 'Vehicle model'),
        validate.vehicleText(vehicleColor, 'Vehicle colour'),
        validate.numberPlate(vehiclePlate),
      ] : []),
    );
    if (err) {
      Alert.alert('Invalid Input', err);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'No active session');
        router.replace('/(auth)/login');
        return;
      }

      // Build vehicle_info string
      const vehicleInfo = isDriver
        ? [
            vehicleColor.trim(),
            vehicleMake.trim(),
            vehicleModel.trim(),
            vehiclePlate.trim() ? `(${vehiclePlate.trim().toUpperCase()})` : '',
          ].filter(Boolean).join(' ')
        : '';

      const { data: existing } = await authService.getProfile(session.user.id);
      let profileData;

      const updates = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        is_driver: isDriver,
        ...(vehicleInfo ? { vehicle_info: vehicleInfo } : {}),
      };

      if (existing) {
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', session.user.id)
          .select()
          .single();
        if (error) throw error;
        profileData = data;
      } else {
        const { data, error } = await authService.createProfile(
          session.user.id,
          session.user.email!,
          { full_name: fullName.trim(), phone: phone.trim() }
        );
        if (error) throw error;
        // Then update with extra fields
        const { data: updated, error: updErr } = await supabase
          .from('profiles')
          .update({ is_driver: isDriver, ...(vehicleInfo ? { vehicle_info: vehicleInfo } : {}) })
          .eq('id', session.user.id)
          .select()
          .single();
        if (updErr) throw updErr;
        profileData = updated ?? data;
      }

      setProfile(profileData);
      router.replace('/(app)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
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
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar} style={styles.avatarPicker}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {fullName ? fullName[0].toUpperCase() : '👤'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              {uploadingAvatar
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ fontSize: 14 }}>�</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>{profile ? 'Edit Profile' : 'Set Up Profile'}</Text>
          <Text style={styles.subtitle}>Tell other riders who you are</Text>
        </View>

        {/* ── Basic Info ─────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Basic Info</Text>

          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Raj Soobrayan"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholderTextColor="#999"
            maxLength={80}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+230 5XXX XXXX"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor="#999"
            maxLength={20}
          />
        </View>

        {/* ── Driver Toggle ──────────────────── */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>I want to offer rides</Text>
              <Text style={styles.toggleSub}>Enable driver mode to post rides</Text>
            </View>
            <Switch
              value={isDriver}
              onValueChange={setIsDriver}
              trackColor={{ false: '#ddd', true: '#34C75980' }}
              thumbColor={isDriver ? '#34C759' : '#fff'}
            />
          </View>
        </View>

        {/* ── Vehicle Info (driver only) ────── */}
        {isDriver && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>🚗  Vehicle Info</Text>
            <Text style={styles.sectionHint}>Help riders identify your car at the pickup point</Text>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Make</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Toyota"
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vitz"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>Colour</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. White"
                  value={vehicleColor}
                  onChangeText={setVehicleColor}
                  autoCapitalize="words"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Number Plate</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. B1234X"
                  value={vehiclePlate}
                  onChangeText={v => setVehiclePlate(v.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={12}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>
        )}

        <Text style={styles.hint}>📍 FlashRide is for Mauritius-based rides only</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flexGrow: 1, padding: 24 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 16 },
  emoji: { fontSize: 56, marginBottom: 8 },
  avatarPicker: { position: 'relative', marginBottom: 14 },
  avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#e0e0e0' },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#333', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 14 },
  sectionHint: { fontSize: 12, color: '#999', marginTop: -10, marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    color: '#111',
  },
  row: { flexDirection: 'row' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: '#111' },
  toggleSub: { fontSize: 12, color: '#999', marginTop: 2 },
  hint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
