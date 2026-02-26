import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { rideService, requestService, ratingService } from '../../lib/api';

export default function ProfileScreen() {
  const { session, profile, logout } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ ridesOffered: 0, ridesTaken: 0 });
  const [ratings, setRatings] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const [ridesRes, reqsRes, ratingsRes] = await Promise.all([
        rideService.getMyRides(session.user.id),
        requestService.getForRider(session.user.id),
        ratingService.getForUser(session.user.id),
      ]);
      const offered = (ridesRes.data || []).filter((r: any) => r.status === 'completed').length;
      const taken = (reqsRes.data || []).filter((r: any) => r.status === 'accepted').length;
      setStats({ ridesOffered: offered, ridesTaken: taken });
      setRatings(ratingsRes.data || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login'); },
      },
    ]);
  };

  const avgRating = ratings.length > 0
    ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Avatar + name */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={s.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={s.email}>{profile?.email ?? ''}</Text>
          {avgRating && (
            <View style={s.ratingBadge}>
              <Text style={s.ratingBadgeText}>⭐ {avgRating}  ·  {ratings.length} review{ratings.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        {!loading && (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statNum}>{stats.ridesOffered}</Text>
              <Text style={s.statLabel}>Rides Offered</Text>
            </View>
            <View style={[s.statCard, s.statCardMid]}>
              <Text style={s.statNum}>{stats.ridesTaken}</Text>
              <Text style={s.statLabel}>Rides Taken</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statNum}>{ratings.length}</Text>
              <Text style={s.statLabel}>Reviews</Text>
            </View>
          </View>
        )}

        {/* Info card */}
        <View style={s.infoCard}>
          <Row icon="📞" label="Phone" value={profile?.phone || 'Not set'} />
          <Row icon="🚗" label="Driver" value={profile?.is_driver ? 'Yes' : 'No'} />
          <Row icon="📅" label="Joined" value={profile ? new Date(profile.created_at).toLocaleDateString('en-MU', { month: 'long', year: 'numeric' }) : '—'} last />
        </View>

        {/* Edit + logout */}
        <TouchableOpacity style={s.editBtn} onPress={() => router.push('/(auth)/profile-setup')}>
          <Text style={s.editBtnText}>✏️  Edit Profile</Text>
        </TouchableOpacity>

        {/* Ratings section */}
        <Text style={s.sectionTitle}>Reviews</Text>
        {loading
          ? <ActivityIndicator color="#007AFF" style={{ marginTop: 16 }} />
          : ratings.length === 0
          ? (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🌟</Text>
              <Text style={s.emptyText}>No reviews yet</Text>
              <Text style={s.emptySub}>Complete rides to receive ratings</Text>
            </View>
          )
          : ratings.map((r: any) => (
            <View key={r.id} style={s.reviewCard}>
              <View style={s.reviewTop}>
                <View style={s.reviewAvatar}>
                  <Text style={s.reviewAvatarText}>{(r.rater?.full_name || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>{r.rater?.full_name ?? 'Anonymous'}</Text>
                  <Text style={s.reviewDate}>
                    {new Date(r.created_at).toLocaleDateString('en-MU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={s.reviewStars}>{'⭐'.repeat(r.score)}</Text>
              </View>
              {r.comment ? <Text style={s.reviewComment}>{r.comment}</Text> : null}
            </View>
          ))
        }

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, last = false }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowIcon}>{icon}</Text>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20, backgroundColor: '#fff', marginBottom: 12 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  avatarText: { fontSize: 40, color: '#fff', fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: '800', color: '#111' },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  ratingBadge: {
    marginTop: 10, backgroundColor: '#FFF3CD', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  ratingBadgeText: { fontSize: 14, fontWeight: '700', color: '#856404' },
  statsRow: {
    flexDirection: 'row', backgroundColor: '#fff',
    marginBottom: 12, paddingVertical: 16,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statCardMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f0f0f0' },
  statNum: { fontSize: 26, fontWeight: '800', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 16, marginBottom: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  rowIcon: { fontSize: 17, marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 15, color: '#555' },
  rowValue: { fontSize: 15, fontWeight: '600', color: '#111' },
  editBtn: {
    backgroundColor: '#007AFF', marginHorizontal: 16,
    padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 24,
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', paddingHorizontal: 16, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#444' },
  emptySub: { fontSize: 13, color: '#aaa', marginTop: 4 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginHorizontal: 16, marginBottom: 10, padding: 14,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  reviewAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  reviewAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reviewName: { fontSize: 14, fontWeight: '700', color: '#111' },
  reviewDate: { fontSize: 12, color: '#aaa' },
  reviewStars: { fontSize: 13 },
  reviewComment: { fontSize: 14, color: '#444', lineHeight: 20, marginTop: 4 },
  logoutBtn: {
    marginHorizontal: 16, marginTop: 8,
    borderWidth: 1.5, borderColor: '#FF3B30',
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
  logoutText: { color: '#FF3B30', fontSize: 15, fontWeight: '700' },
});
