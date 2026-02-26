/**
 * RideCard – shared ride listing card used in Search and Home.
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface RideCardProps {
  ride: {
    departure_time: string;
    driver?: { full_name?: string; rating_avg?: number };
    origin_address: string;
    destination_address: string;
    price_per_seat?: number;
    seats_available: number;
  };
  onPress: () => void;
}

export default function RideCard({ ride, onPress }: RideCardProps) {
  const dep = new Date(ride.departure_time);
  const fmtDate = dep.toLocaleDateString('en-MU', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtTime = dep.toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' });
  const initial = (ride.driver?.full_name || '?')[0].toUpperCase();

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.driverName}>{ride.driver?.full_name || 'Driver'}</Text>
          <Text style={s.driverRating}>
            {(ride.driver?.rating_avg ?? 0) > 0
              ? `⭐ ${ride.driver!.rating_avg}`
              : 'New driver'}
          </Text>
        </View>
        <View style={s.pricePill}>
          <Text style={s.priceText}>
            {ride.price_per_seat ? `MUR ${ride.price_per_seat}` : 'Free'}
          </Text>
        </View>
      </View>

      <View style={s.route}>
        <View style={s.routePoint}>
          <View style={[s.dot, { backgroundColor: '#34C759' }]} />
          <Text style={s.routeText} numberOfLines={1}>{ride.origin_address}</Text>
        </View>
        <View style={s.routeLine} />
        <View style={s.routePoint}>
          <View style={[s.dot, { backgroundColor: '#FF3B30' }]} />
          <Text style={s.routeText} numberOfLines={1}>{ride.destination_address}</Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <Text style={s.meta}>{fmtDate} at {fmtTime}</Text>
        <Text style={s.meta}>
          {ride.seats_available} seat{ride.seats_available !== 1 ? 's' : ''} left
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function RideCardSkeleton() {
  // Inline skeleton rows — avoids circular imports
  const { useEffect, useRef } = require('react');
  const { Animated } = require('react-native');
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    p.start();
    return () => p.stop();
  }, [opacity]);

  const Box = ({ w, h, r = 8 }: { w: any; h: number; r?: number }) => (
    <Animated.View style={{ width: w, height: h, borderRadius: r, backgroundColor: '#e0e0e0', opacity, marginBottom: 8 }} />
  );

  return (
    <View style={[s.card, { gap: 0 }]}>
      <View style={s.cardHeader}>
        <View style={[s.avatar, { backgroundColor: '#e0e0e0' }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <Box w={120} h={14} />
          <Box w={80} h={12} />
        </View>
        <Box w={60} h={28} r={20} />
      </View>
      <Box w="90%" h={14} />
      <Box w="70%" h={14} />
      <View style={s.cardFooter}>
        <Box w={140} h={12} />
        <Box w={80} h={12} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#111' },
  driverRating: { fontSize: 13, color: '#666' },
  pricePill: { backgroundColor: '#e8f4fd', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priceText: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  route: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  routeText: { fontSize: 14, color: '#333', flex: 1 },
  routeLine: { width: 2, height: 10, backgroundColor: '#ddd', marginLeft: 4, marginBottom: 4 },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10,
  },
  meta: { fontSize: 13, color: '#888' },
});
