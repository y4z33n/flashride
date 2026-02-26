import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import SkeletonLoader from '../../components/SkeletonLoader';

interface ChatThread {
  rideId: string;
  title: string;
  lastMessage: string;
  lastTime: string;
  unread: boolean;
  isDriver: boolean;
}

export default function InboxScreen() {
  const { session } = useAuthStore();
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      // Get rides where user is the driver
      const { data: driverRides } = await supabase
        .from('rides')
        .select('id, origin_address, destination_address, status')
        .eq('driver_id', session.user.id)
        .in('status', ['open', 'full', 'in_progress', 'completed'])
        .order('created_at', { ascending: false });

      // Get rides where user is an accepted rider
      const { data: riderRequests } = await supabase
        .from('ride_requests')
        .select('ride_id, ride:rides(id, origin_address, destination_address, status)')
        .eq('rider_id', session.user.id)
        .eq('status', 'accepted');

      const rideIds = new Set<string>();
      const result: ChatThread[] = [];

      const processRide = async (ride: any, isDriver: boolean) => {
        if (!ride || rideIds.has(ride.id)) return;
        rideIds.add(ride.id);

        const origin = ride.origin_address?.split(',')[0] ?? 'Unknown';
        const dest = ride.destination_address?.split(',')[0] ?? 'Unknown';

        // Get last message for this ride
        const { data: msgs } = await supabase
          .from('messages')
          .select('body, created_at')
          .eq('ride_id', ride.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0];
        result.push({
          rideId: ride.id,
          title: `${origin} → ${dest}`,
          lastMessage: lastMsg?.body ?? 'No messages yet',
          lastTime: lastMsg?.created_at ?? '',
          unread: false,
          isDriver,
        });
      };

      for (const ride of driverRides || []) {
        await processRide(ride, true);
      }
      for (const req of riderRequests || []) {
        await processRide((req as any).ride, false);
      }

      // Sort by last message time, newest first
      result.sort((a, b) => {
        if (!a.lastTime) return 1;
        if (!b.lastTime) return -1;
        return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime();
      });

      setThreads(result);
    } catch (err) {
      console.error('Inbox load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const fmtTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-MU', { day: 'numeric', month: 'short' });
  };

  const renderThread = ({ item }: { item: ChatThread }) => (
    <TouchableOpacity
      style={s.thread}
      onPress={() => router.push(`/(app)/chat/${item.rideId}` as any)}
      activeOpacity={0.8}
    >
      <View style={[s.threadIcon, { backgroundColor: item.isDriver ? '#007AFF' : '#34C759' }]}>
        <Text style={s.threadIconText}>{item.isDriver ? '🚗' : '🧑'}</Text>
      </View>
      <View style={s.threadBody}>
        <View style={s.threadTop}>
          <Text style={s.threadTitle} numberOfLines={1}>{item.title}</Text>
          {item.lastTime ? <Text style={s.threadTime}>{fmtTime(item.lastTime)}</Text> : null}
        </View>
        <View style={s.threadBottom}>
          <Text style={s.threadLast} numberOfLines={1}>{item.lastMessage}</Text>
          <Text style={s.threadRole}>{item.isDriver ? 'Driver' : 'Rider'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Inbox</Text>
      {loading ? (
        <View style={{ padding: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[s.thread, { gap: 0 }]}>
              <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <SkeletonLoader width="60%" height={14} />
                <SkeletonLoader width="80%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={item => item.rideId}
          renderItem={renderThread}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={threads.length === 0 ? s.emptyContainer : { paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💬</Text>
              <Text style={s.emptyTitle}>No chats yet</Text>
              <Text style={s.emptySub}>Chats appear here once you join or offer a ride</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', padding: 20, paddingBottom: 12 },
  thread: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  threadIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  threadIconText: { fontSize: 22 },
  threadBody: { flex: 1 },
  threadTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  threadTitle: { fontSize: 15, fontWeight: '700', color: '#111', flex: 1, marginRight: 8 },
  threadTime: { fontSize: 12, color: '#aaa' },
  threadBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadLast: { fontSize: 13, color: '#888', flex: 1, marginRight: 8 },
  threadRole: { fontSize: 11, fontWeight: '700', color: '#007AFF' },
  emptyContainer: { flex: 1 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#444' },
  emptySub: { fontSize: 14, color: '#999', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
});
