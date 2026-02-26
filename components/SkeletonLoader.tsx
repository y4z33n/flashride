/**
 * SkeletonLoader – animated placeholder for loading states.
 *
 * Usage:
 *   <SkeletonLoader width={200} height={16} borderRadius={8} />
 *   <SkeletonLoader width="100%" height={80} style={{ marginBottom: 8 }} />
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';

interface Props {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonLoader({ width, height, borderRadius = 8, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        s.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

const s = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e0e0e0',
  },
});
