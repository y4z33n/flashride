import { View, Text, StyleSheet } from 'react-native';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FlashRide</Text>
      <Text style={styles.subtitle}>Login Screen</Text>
      <Text style={styles.info}>Email authentication will be implemented in Step 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  info: {
    fontSize: 14,
    color: '#666',
  },
});
