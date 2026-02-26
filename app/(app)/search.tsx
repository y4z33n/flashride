import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { rideService, PAGE_SIZE } from "../../lib/api";
import { useRideStore } from "../../store/rideStore";
import { useAuthStore } from "../../store/authStore";
import { getCoords } from "../../lib/places";
import PlaceAutocomplete from "../../components/PlaceAutocomplete";
import RideCard, { RideCardSkeleton } from "../../components/RideCard";
import type { MUPlace } from "../../lib/places";

export default function SearchScreen() {
  const router = useRouter();
  const { setRides, setCurrentRide } = useRideStore();
  const { session } = useAuthStore();

  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const doSearch = async (pageNum: number, append = false) => {
    if (pageNum === 0) { setLoading(true); setSearched(true); }
    else setLoadingMore(true);

    try {
      const oc = originCoords ?? (origin.trim() ? getCoords(origin) : { lat: -20.2, lng: 57.5 });
      const dc = destinationCoords ?? (destination.trim() ? getCoords(destination) : { lat: -20.2, lng: 57.5 });

      const { data, error, hasMore: more } = await rideService.search({
        origin_lat: oc.lat,
        origin_lng: oc.lng,
        destination_lat: dc.lat,
        destination_lng: dc.lng,
        date: date.toISOString(),
        page: pageNum,
      });
      if (error) throw error;
      const filtered = (data || []).filter((r: any) =>
        r.driver_id !== session?.user?.id &&
        (!origin.trim() || r.origin_address.toLowerCase().includes(origin.toLowerCase())) &&
        (!destination.trim() || r.destination_address.toLowerCase().includes(destination.toLowerCase()))
      );
      const next = append ? [...results, ...filtered] : filtered;
      setResults(next);
      setRides(next);
      setHasMore(more ?? false);
      setPage(pageNum);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => doSearch(0, false);
  const handleLoadMore = () => { if (!loadingMore && hasMore) doSearch(page + 1, true); };

  return (
    <SafeAreaView style={s.container}>
      <Text style={s.title}>Find a Ride</Text>

      <View style={s.searchBox}>
        <PlaceAutocomplete
          placeholder="From… (e.g. Curepipe)"
          value={origin}
          onChangeText={setOrigin}
          onSelect={(place: MUPlace) => {
            setOrigin(place.name);
            setOriginCoords({ lat: place.lat, lng: place.lng });
          }}
          containerStyle={s.autocompleteContainer}
        />
        <PlaceAutocomplete
          placeholder="To… (e.g. Port Louis)"
          value={destination}
          onChangeText={setDestination}
          onSelect={(place: MUPlace) => {
            setDestination(place.name);
            setDestinationCoords({ lat: place.lat, lng: place.lng });
          }}
          containerStyle={s.autocompleteContainer}
        />

        {/* Date picker */}
        <TouchableOpacity style={s.datePill} onPress={() => setShowDatePicker(true)}>
          <Text style={s.datePillIcon}>📅</Text>
          <Text style={s.datePillText}>{fmtDate(date)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === "ios");
              if (d) setDate(d);
            }}
          />
        )}
        {/* iOS inline confirm */}
        {showDatePicker && Platform.OS === "ios" && (
          <TouchableOpacity style={s.doneBtn} onPress={() => setShowDatePicker(false)}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.btn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Search Rides</Text>}
        </TouchableOpacity>
      </View>

      {searched && !loading && (
        <Text style={s.resultCount}>
          {results.length > 0
            ? `${results.length} ride${results.length !== 1 ? "s" : ""} found`
            : "No rides found"}
        </Text>
      )}

      {loading ? (
        <View style={{ padding: 16 }}>
          {[0, 1, 2].map(i => <RideCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onPress={() => {
                setCurrentRide(item);
                router.push(`/(app)/ride/${item.id}` as any);
              }}
            />
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#007AFF" style={{ marginVertical: 16 }} />
            ) : hasMore ? (
              <TouchableOpacity style={s.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={s.loadMoreText}>Load more rides</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            searched ? (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={s.emptyText}>No rides available</Text>
                <Text style={s.emptySub}>Try a different date or location</Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  title: { fontSize: 26, fontWeight: "bold", color: "#111", paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  searchBox: { paddingHorizontal: 16, marginBottom: 4, zIndex: 10 },
  autocompleteContainer: { marginBottom: 10 },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#c8e0ff",
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  datePillIcon: { fontSize: 16, marginRight: 8 },
  datePillText: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
  doneBtn: { alignItems: "flex-end", marginBottom: 8 },
  doneBtnText: { color: "#007AFF", fontSize: 15, fontWeight: "700" },
  btn: { backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resultCount: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: "#666", fontWeight: "600" },
  loadMoreBtn: {
    alignItems: "center", padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: "#c8e0ff", borderRadius: 10, marginHorizontal: 16,
  },
  loadMoreText: { color: "#007AFF", fontWeight: "600", fontSize: 14 },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#444" },
  emptySub: { fontSize: 14, color: "#999", marginTop: 4 },
});
