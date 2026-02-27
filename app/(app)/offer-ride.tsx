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
import { getCoords } from "../../lib/places";
import { validate, firstError } from "../../lib/validation";
import PlaceAutocomplete from "../../components/PlaceAutocomplete";
import type { MUPlace } from "../../lib/places";

export default function OfferRideScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const { setCurrentRide } = useRideStore();

  // Route
  const [origin, setOrigin] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Trip details
  const [seats, setSeats] = useState("3");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [departure, setDeparture] = useState(new Date(Date.now() + 3600000));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Vehicle info
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");

  const [loading, setLoading] = useState(false);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-MU", { weekday: "short", day: "numeric", month: "short" });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-MU", { hour: "2-digit", minute: "2-digit" });

  const handleSubmit = async () => {
    const err = firstError(
      validate.address(origin, "Pickup location"),
      validate.address(destination, "Destination"),
      validate.intRange(seats, "Seats", 1, 8),
      validate.optionalPrice(price),
      validate.futureDate(departure),
      validate.vehicleText(vehicleMake, "Vehicle make"),
      validate.vehicleText(vehicleModel, "Vehicle model"),
      validate.vehicleText(vehicleColor, "Vehicle colour"),
      validate.numberPlate(vehiclePlate),
    );
    if (err) return Alert.alert("Invalid Input", err);

    if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
      return Alert.alert("Invalid Route", "Pickup and destination cannot be the same.");
    }

    setLoading(true);
    try {
      const oc = originCoords ?? getCoords(origin);
      const dc = destinationCoords ?? getCoords(destination);

      // Build notes with vehicle info appended if provided
      const vehicleInfo = [
        vehicleMake && vehicleModel ? `${vehicleColor} ${vehicleMake} ${vehicleModel}`.trim() : null,
        vehiclePlate ? `Plate: ${vehiclePlate.toUpperCase()}` : null,
      ].filter(Boolean).join(" • ");

      const combinedNotes = [
        notes.trim() || null,
        vehicleInfo || null,
      ].filter(Boolean).join("\n");

      const { data, error } = await rideService.create({
        origin_address: origin.trim(),
        origin_lat: oc.lat,
        origin_lng: oc.lng,
        destination_address: destination.trim(),
        destination_lat: dc.lat,
        destination_lng: dc.lng,
        departure_time: departure.toISOString(),
        seats_total: parseInt(seats, 10),
        price_per_seat: price ? parseFloat(price) : undefined,
        notes: combinedNotes || undefined,
      });
      if (error) throw error;
      setCurrentRide(data);
      Alert.alert("Ride Created! 🎉", "Your ride is now live and riders can request to join.", [
        { text: "View Ride", onPress: () => router.replace(`/(app)/ride/${data.id}` as any) },
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

          {/* ── Route ─────────────────────────── */}
          <View style={s.sectionBox}>
            <Text style={s.sectionHeader}>🗺️  Route</Text>
            <PlaceAutocomplete
              label="Pickup Location *"
              placeholder="e.g. Curepipe, Port Louis…"
              value={origin}
              onChangeText={setOrigin}
              onSelect={(place: MUPlace) => {
                setOrigin(place.name);
                setOriginCoords({ lat: place.lat, lng: place.lng });
              }}
            />
            <PlaceAutocomplete
              label="Destination *"
              placeholder="e.g. Grand Baie, SSR Airport…"
              value={destination}
              onChangeText={setDestination}
              onSelect={(place: MUPlace) => {
                setDestination(place.name);
                setDestinationCoords({ lat: place.lat, lng: place.lng });
              }}
            />
          </View>

          {/* ── Date & Time ────────────────────── */}
          <View style={s.sectionBox}>
            <Text style={s.sectionHeader}>🕐  Departure</Text>
            <View style={s.row}>
              <TouchableOpacity
                style={[s.pill, { flex: 1, marginRight: 8 }]}
                onPress={() => setShowDate(true)}
              >
                <Text style={s.pillText}>{fmtDate(departure)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.pill, { flex: 1 }]} onPress={() => setShowTime(true)}>
                <Text style={s.pillText}>{fmtTime(departure)}</Text>
              </TouchableOpacity>
            </View>
            {showDate && (
              <DateTimePicker
                value={departure}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, d) => {
                  setShowDate(false);
                  if (d) {
                    const u = new Date(departure);
                    u.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    setDeparture(u);
                  }
                }}
              />
            )}
            {showTime && (
              <DateTimePicker
                value={departure}
                mode="time"
                onChange={(_, d) => {
                  setShowTime(false);
                  if (d) {
                    const u = new Date(departure);
                    u.setHours(d.getHours(), d.getMinutes());
                    setDeparture(u);
                  }
                }}
              />
            )}
          </View>

          {/* ── Seats & Price ──────────────────── */}
          <View style={s.sectionBox}>
            <Text style={s.sectionHeader}>💺  Seats & Price</Text>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Seats Available *</Text>
                <TextInput
                  style={s.input}
                  value={seats}
                  onChangeText={setSeats}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Price/seat (MUR)</Text>
                <TextInput
                  style={s.input}
                  placeholder="0 = Free"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* ── Vehicle Info ───────────────────── */}
          <View style={s.sectionBox}>
            <Text style={s.sectionHeader}>🚗  Your Vehicle</Text>
            <Text style={s.sectionHint}>Help riders identify your car at the pickup point</Text>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Make</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Toyota"
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Model</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. Vitz"
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.label}>Colour</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. White"
                  value={vehicleColor}
                  onChangeText={setVehicleColor}
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Number Plate</Text>
                <TextInput
                  style={s.input}
                  placeholder="e.g. B1234X"
                  value={vehiclePlate}
                  onChangeText={v => setVehiclePlate(v.toUpperCase())}
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  maxLength={12}
                />
              </View>
            </View>
          </View>

          {/* ── Notes ─────────────────────────── */}
          <View style={s.sectionBox}>
            <Text style={s.sectionHeader}>📝  Notes (optional)</Text>
            <TextInput
              style={[s.input, s.area]}
              placeholder="e.g. No smoking, luggage ok, female only…"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
              maxLength={300}
            />
            <Text style={s.charCount}>{notes.length}/300</Text>
          </View>

          {/* ── Summary ───────────────────────── */}
          {origin.length > 0 && destination.length > 0 && (
            <View style={s.summaryCard}>
              <Text style={s.summaryTitle}>📋  Summary</Text>
              <SummaryRow label="From" value={origin} />
              <SummaryRow label="To" value={destination} />
              <SummaryRow label="When" value={`${fmtDate(departure)} at ${fmtTime(departure)}`} />
              <SummaryRow
                label="Seats"
                value={`${seats}  ${price ? "MUR " + price + "/seat" : "Free"}`}
              />
              {(vehicleMake || vehicleColor) && (
                <SummaryRow
                  label="Car"
                  value={[vehicleColor, vehicleMake, vehicleModel].filter(Boolean).join(" ")}
                />
              )}
              {vehiclePlate ? <SummaryRow label="Plate" value={vehiclePlate.toUpperCase()} /> : null}
            </View>
          )}

          <TouchableOpacity
            style={[s.btn, loading && s.btnOff]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Post Ride</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#111", marginBottom: 4 },
  sub: { fontSize: 15, color: "#666", marginBottom: 20 },
  sectionBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "visible",
  },
  sectionHeader: { fontSize: 15, fontWeight: "700", color: "#111", marginBottom: 12 },
  sectionHint: { fontSize: 12, color: "#999", marginTop: -8, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#444", marginBottom: 6 },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: "#111",
  },
  area: { height: 88, textAlignVertical: "top" },
  charCount: { fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 4 },
  row: { flexDirection: "row", marginBottom: 0, gap: 8 },
  pill: {
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#c8e0ff",
    borderRadius: 10,
    padding: 13,
    alignItems: "center",
  },
  pillText: { fontSize: 15, color: "#007AFF", fontWeight: "600" },
  summaryCard: { backgroundColor: "#e8f4fd", borderRadius: 14, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: "#007AFF", marginBottom: 10 },
  summaryRow: { flexDirection: "row", marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: "#666", width: 52, fontWeight: "600" },
  summaryValue: { fontSize: 13, color: "#111", flex: 1, fontWeight: "500" },
  btn: { backgroundColor: "#007AFF", padding: 16, borderRadius: 12, alignItems: "center" },
  btnOff: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
