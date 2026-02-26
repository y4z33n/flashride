/**
 * Button – shared primary/secondary/danger button.
 *
 * Usage:
 *   <Button label="Search Rides" onPress={handleSearch} loading={loading} />
 *   <Button label="Cancel" variant="danger" onPress={handleCancel} />
 *   <Button label="Skip" variant="ghost" onPress={skip} />
 */
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, type ViewStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const BG: Record<Variant, string> = {
  primary: '#007AFF',
  secondary: '#fff',
  danger: '#FF3B30',
  ghost: 'transparent',
  success: '#34C759',
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: '#fff',
  secondary: '#007AFF',
  danger: '#fff',
  ghost: '#007AFF',
  success: '#fff',
};

const BORDER_COLOR: Record<Variant, string | undefined> = {
  primary: undefined,
  secondary: '#007AFF',
  danger: undefined,
  ghost: undefined,
  success: undefined,
};

export default function Button({
  label, onPress, variant = 'primary', loading = false, disabled = false, style, fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        s.btn,
        { backgroundColor: BG[variant], alignSelf: fullWidth ? 'stretch' : 'center' },
        BORDER_COLOR[variant] ? { borderWidth: 1.5, borderColor: BORDER_COLOR[variant] } : null,
        isDisabled && s.disabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={TEXT_COLOR[variant]} size="small" />
        : <Text style={[s.label, { color: TEXT_COLOR[variant] }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
