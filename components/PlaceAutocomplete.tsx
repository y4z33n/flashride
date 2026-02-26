/**
 * PlaceAutocomplete – Mauritius location picker with offline suggestions.
 *
 * Usage:
 *   <PlaceAutocomplete
 *     label="Pickup Location"
 *     placeholder="e.g. Port Louis"
 *     value={origin}
 *     onSelect={(place) => { setOrigin(place.name); setOriginCoords(place); }}
 *   />
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { autocompletePlaces, type MUPlace } from '../lib/places';

interface Props {
  label?: string;
  placeholder?: string;
  value: string;
  onSelect: (place: MUPlace) => void;
  onChangeText?: (text: string) => void;
  /** Extra style applied to the outer container */
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export default function PlaceAutocomplete({
  label,
  placeholder = 'Type a location…',
  value,
  onSelect,
  onChangeText,
  containerStyle,
  inputStyle,
}: Props) {
  const [suggestions, setSuggestions] = useState<MUPlace[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleChange = (text: string) => {
    onChangeText?.(text);
    const matches = autocompletePlaces(text);
    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const handleSelect = (place: MUPlace) => {
    onSelect(place);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <View style={[s.container, containerStyle]}>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput
        style={[s.input, inputStyle]}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#999"
        autoCorrect={false}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
      />
      {showSuggestions && (
        <View style={s.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.name}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.item}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemRegion}>{item.region}</Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={s.separator} />}
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginTop: 2,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  itemRegion: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});
