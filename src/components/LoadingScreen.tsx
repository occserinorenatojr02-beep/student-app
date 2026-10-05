import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  text: { marginTop: 12, fontSize: 14, color: '#64748b' },
});
