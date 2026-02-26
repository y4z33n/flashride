/**
 * Avatar – circular avatar with initials fallback and optional image.
 * Supports profile photo via `uri` prop. Falls back to initials on error.
 */
import { useState } from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native';

const COLORS = ['#007AFF', '#34C759', '#5856D6', '#FF9500', '#FF3B30', '#AF52DE'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface Props {
  name?: string;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}

export default function Avatar({ name = '?', uri, size = 44, style }: Props) {
  const [imgError, setImgError] = useState(false);
  const initial = (name?.trim()[0] ?? '?').toUpperCase();
  const bg = colorForName(name);
  const showImage = !!uri && !imgError;

  return (
    <View
      style={[
        s.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[s.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
