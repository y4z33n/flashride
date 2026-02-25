import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { rideService } from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useRideStore } from "../../store/rideStore";

const MU_PLACES: Record<string, { lat: number; lng: number }> = {
  "Port Louis": { lat: -20.1609, lng: 57.4977 },
  "Curepipe": { lat: -20.3173, lng: 57.5260 },
  "Quatre Bornes": { lat: -20.2654, lng: 57.4801 },
  "Rose Hill": { lat: -20.2340, lng: 57.4597 },
  "Vacoas": { lat: -20.2985, lng: 57.4780 },
  "Phoenix": { lat: -20.2880, lng: 57.4950 },
  "Grand Baie": { lat: -20.0133, lng: 57.5833 },
  "Flic en Flac": { lat: -20.2894, lng: 57.3634 },
  "Mahebourg": { lat: -20.4089, lng: 57.7064 },
  "SSR Airport": { lat: -20.4302, lng: 57.6836 },
};

function getCoords(address: string) {
  const match = Object.keys(MU_PLACES).find(p =>
    address.toLowerCase().includes(p.toLowerCase())
  );
  return match ? MU_PLACES[match] : { lat: -20.2, lng: 57.5 };
}

export default function OfferRideScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { setCurrentRide } = useRideStore();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [seats, setSeats] = useState("3");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [departure, setDeparture] = useState(new Date(Date.now() + 3600000));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [loading, setLoading] = useState(false);

  const fmtDate = (d: Date) => d.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d: Date) => d.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  const handleSubmit = async () => {
    if (!origin.trim()) return Alert.alert("Error", "Enter pickup location");
    if (!destination.trim()) return Alert.alert("Error", "Enter destination");
    const seatsNum = parseInt(seats);
    if (isNaN(seatsNum) || seatsNum < 1 || seatsNum > 8) return Alert.alert("Error", "Seats must be 1-8");
    if (departure < new Date()) return Alert.alert("Error", "Departure must be in the future");

    setLoading(true);
    try {
      const oc = getCoords(origin);
      const dc = getCoords(destination);
      const { data, error } = await rideService.create({
        driver_id: session!.user.id,
        origin_address: origin.trim(),
        origin_lat: oc.lat,
        origin_lng: oc.lng,
        destination_address: destination.trim(),
        destination_lat: dc.lat,
        destination_lng: dc.lng,
        departure_time: departure.toISOString(),
        seats_total: seatsNum,
        seats_available: seatsNum,
        price_per_seat: price ? parseFloat(price) : undefined,
        notes: notes.trim() || undefined,
        status: "open",
      });
      if (error) throw error;
      setCurrentRide(data);
      Alert.alert("Ride Created!", "Your ride is now live.", [
        { text: "Go Home", onPress: () => router.replace("/(app)/home") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create ride");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Offer a Ride</Text>
          <Text style={s.sub}>Share your journey across Mauritius</Text>

          <Text style={s.label}>Pickup Location</Text>
          <TextInput style={s.input} placeholder="e.g. Port Louis, Curepipe..." value={origin} onChangeText={setOrigin} placeholderTextColor="#999" />

          <Text style={s.label}>Destination</Text>
          <TextInput style={s.input} placeholder="e.g. Grand Baie, SSR Airport..." value={destination} onChangeText={setDestination} placeholderTextColor="#999" />

          <Text style={s.label}>Departure</Text>
          <View style={s.row}>
            <TouchableOpacity style={[s.pill, { flex: 1, marginRight: 8 }]} onPress={() => setShowDate(true)}>
              <Text style={s.pillText}>{fmtDate(departure)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.pill, { flex: 1 }]} onPress={() => setShowTime(true)}>
              <Text style={s.pillText}>{fmtTime(departure)}</Text>
            </TouchableOpacity>
          </View>

          {showDate && (
            <DateTimePicker value={departure} mode="date" minimumDate={new Date()}
              onChange={(_, d) => { setShowDate(false); if (d) { const u = new Date(departure); u.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setDeparture(u); } }} />
          )}
          {showTime && (
            <DateTimePicker value={departure} mode="time"
              onChange={(_, d) => { setShowTime(false); if (d) { const u = new Date(departure); u.setHours(d.getHours(), d.getMinutes()); setDeparture(u); } }} />
          )}

          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Seats Available</Text>
              <TextInput style={s.input} value={seats} onChangeText={setSeats} keyboardType="number-pad" maxLength={1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Price/seat (MUR)</Text>
              <TextInput style={s.input} placeholder="Optional" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor="#999" />
            </View>
          </View>

          <Text style={s.label}>Notes (optional)</Text>
          <TextInput style={[s.input, s.area]} placeholder="e.g. No smoking, luggage ok..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholderTextColor="#999" />

          {origin.length > 0 && destination.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Summary</Text>
              <Text style={s.cardRow}>From  {origin}</Text>
              <Text style={s.cardRow}>To      {destination}</Text>
              <Text style={s.cardRow}>When  {fmtDate(departure)} at {fmtTime(departure)}</Text>
              <Text style={s.cardRow}>Seats  {seats}  {price ? "MUR " + price + "/seat" : "Free"}</Text>
            </View>
          )}

          <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Post Ride</Text>}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#111", marginBottom: 4 },
  sub: { fontSize: 15, color: "#666", marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 14, fontSize: 15, color: "#111", marginBottom: 16 },
  area: { height: 90, textAlignVertical: "top" },
  row: { flexDirection: "row", marginBottom: 16 },
  pill: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 10, padding: 14, alignItems: "center" },
  pillText: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
  card: { backgroundColor: "#e8f4fd", borderRadius: 12, padding: 16, marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#007AFF", marginBottom: 8 },
  cardRow: { fontSize: 14, color: "#333", marginBottom: 4 },
  btn: { backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: "center" },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
