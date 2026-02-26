// Web stub — react-native-maps is not supported on web.
// This file is resolved instead of react-native-maps on the web platform.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Unsupported = () => (
  <View style={s.box}>
    <Text style={s.text}>Map not available on web</Text>
  </View>
);

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  text: { color: '#888', fontSize: 14 },
});

export default Unsupported;
export const Marker = () => null;
export const Polyline = () => null;
export const PROVIDER_GOOGLE = undefined;
