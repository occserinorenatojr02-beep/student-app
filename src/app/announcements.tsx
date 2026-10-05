import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

type Announcement = { id: number; title: string; message: string; date: string };

export default function Announcements() {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Announcement[]>("/announcements").then(r => setData(r.data)).catch(console.log).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading announcements..." />;

  return <View style={styles.container}>
    <Text style={styles.title}>Announcements</Text>
    <Text style={styles.subtitle}>Latest school updates</Text>
    <FlatList data={data} keyExtractor={item => String(item.id)} renderItem={({ item }) => (
      <View style={styles.card}>
        <View style={styles.icon}><Text style={styles.emoji}>📢</Text></View>
        <View style={styles.content}>
          <Text style={styles.name}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>
    )} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", padding: 18 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 18, marginBottom: 12, flexDirection: "row", elevation: 3 },
  icon: { width: 50, height: 50, borderRadius: 14, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 13 },
  emoji: { fontSize: 23 },
  content: { flex: 1 },
  name: { fontSize: 17, fontWeight: "900", color: "#172033" },
  message: { color: "#64748B", lineHeight: 20, marginTop: 6 },
  date: { color: "#2563EB", fontSize: 12, fontWeight: "800", marginTop: 9 },
});
