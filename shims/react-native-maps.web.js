// Shim for react-native-maps on web.
// react-native-maps uses native-only RN internals and cannot run on web.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  text: { color: '#888', fontSize: 14 },
});

function MapView({ children, style }) {
  return (
    <View style={[s.box, style]}>
      <Text style={s.text}>🗺️ Map not available on web</Text>
    </View>
  );
}

MapView.Animated = MapView;

export default MapView;
export const Marker = () => null;
export const Polyline = () => null;
export const Callout = () => null;
export const Circle = () => null;
export const Polygon = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = null;
