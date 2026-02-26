import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../../../lib/supabase';
import { rideService } from '../../../../lib/api';
import { useAuthStore } from '../../../../store/authStore';

interface DriverLocation {
  lat: number;
  lng: number;
  heading: number | null;
}

export default function LiveMapScreen() {
  const { id: rideId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const mapRef = useRef<MapView>(null);

  const [ride, setRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadRide();
    getMyLocation();
    loadLatestLocation();

    // Subscribe to live driver location updates
    const channel = supabase
      .channel(`location:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_updates',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row?.lat) return;
          const loc: DriverLocation = {
            lat: row.lat,
            lng: row.lng,
            heading: row.heading ?? null,
          };
          setDriverLocation(loc);
          setConnected(true);
          // Pan map to driver
          mapRef.current?.animateToRegion(
            { latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            600
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  const loadRide = async () => {
    const { data } = await rideService.getById(rideId!);
    setRide(data);
    setLoading(false);
  };

  const loadLatestLocation = async () => {
    // There is at most one row per ride_id — fetch it directly
    const { data } = await supabase
      .from('location_updates')
      .select('lat, lng, heading')
      .eq('ride_id', rideId)
      .maybeSingle();
    if (data) {
      setDriverLocation({ lat: data.lat, lng: data.lng, heading: data.heading ?? null });
      setConnected(true);
    }
  };

  const getMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch (_) {}
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}><ActivityIndicator size="large" color="#007AFF" /></View>
      </SafeAreaView>
    );
  }

  const origin = ride ? { latitude: ride.origin_lat, longitude: ride.origin_lng } : null;
  const destination = ride ? { latitude: ride.destination_lat, longitude: ride.destination_lng } : null;
  const initialRegion = driverLocation
    ? { latitude: driverLocation.lat, longitude: driverLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : origin
    ? { ...origin, latitudeDelta: 0.1, longitudeDelta: 0.1 }
    : { latitude: -20.2, longitude: 57.5, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {ride ? `${ride.origin_address.split(',')[0]} → ${ride.destination_address.split(',')[0]}` : 'Live Map'}
          </Text>
          <View style={s.statusRow}>
            <View style={[s.statusDot, { backgroundColor: connected ? '#34C759' : '#FF9500' }]} />
            <Text style={s.statusText}>{connected ? 'Driver location live' : 'Waiting for driver...'}</Text>
          </View>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={s.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Origin pin */}
        {origin && (
          <Marker coordinate={origin} title="Pickup" pinColor="#34C759" />
        )}

        {/* Destination pin */}
        {destination && (
          <Marker coordinate={destination} title="Drop-off" pinColor="#FF3B30" />
        )}

        {/* Driver live location */}
        {driverLocation && (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Driver"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={driverLocation.heading ?? 0}
          >
            <View style={s.driverMarker}>
              <Text style={s.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        )}

        {/* My (rider) location */}
        {myLocation && (
          <Marker
            coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
            title="You"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={s.myMarker} />
          </Marker>
        )}

        {/* Route line: driver → destination when driver is live */}
        {driverLocation && destination && (
          <Polyline
            coordinates={[
              { latitude: driverLocation.lat, longitude: driverLocation.lng },
              destination,
            ]}
            strokeColor="#007AFF"
            strokeWidth={3}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* Bottom card */}
      {!connected && (
        <View style={s.waitCard}>
          <Text style={s.waitEmoji}>📡</Text>
          <Text style={s.waitTitle}>Waiting for driver</Text>
          <Text style={s.waitSub}>The map will update automatically when the driver shares their location</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8',
    zIndex: 10,
  },
  backBtn: { padding: 6, marginRight: 8 },
  backText: { fontSize: 22, color: '#007AFF' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, color: '#666' },
  map: { flex: 1 },
  driverMarker: {
    backgroundColor: '#fff', borderRadius: 20, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  driverMarkerText: { fontSize: 24 },
  myMarker: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#007AFF',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  waitCard: {
    position: 'absolute', bottom: 32, left: 20, right: 20,
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  waitEmoji: { fontSize: 36, marginBottom: 8 },
  waitTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 },
  waitSub: { fontSize: 13, color: '#888', textAlign: 'center' },
});
