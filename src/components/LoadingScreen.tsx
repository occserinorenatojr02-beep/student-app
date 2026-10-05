import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export default function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>OCC</Text>
      </View>
      <Text style={styles.title}>Student Portal</Text>
      <Text style={styles.subtitle}>Opol Community College</Text>
      <ActivityIndicator size="large" color="#2563EB" style={styles.loader} />
      <Text style={styles.loading}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", alignItems: "center", justifyContent: "center" },
  logo: { width: 85, height: 85, borderRadius: 25, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  logoText: { color: "#FFF", fontSize: 25, fontWeight: "900" },
  title: { fontSize: 27, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 5 },
  loader: { marginTop: 30 },
  loading: { color: "#64748B", marginTop: 12, fontSize: 14 },
});
