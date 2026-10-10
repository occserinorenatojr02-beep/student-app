import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

type Announcement = { id: number; title: string; message: string; date: string };

export default function Announcements() {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GET /announcements
  const load = useCallback(async () => {
    try {
      const res = await api.get<Announcement[]>("/announcements");
      setData(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (e) {
      const err = e as { message?: string; response?: { status?: number } };
      setError(
        err.response?.status
          ? `The server answered with an error (${err.response.status}).`
          : "Could not reach the server. Check your connection and the API address."
      );
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen message="Loading announcements..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Announcements</Text>
            <Text style={styles.subtitle}>Latest school updates</Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Couldn't load announcements</Text>
              <Text style={styles.noticeText}>{error}</Text>
              <Pressable style={styles.retry} onPress={onRefresh}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>No announcements yet</Text>
              <Text style={styles.noticeText}>New school updates will show up here.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.icon}>
              <Text style={styles.emoji}>📢</Text>
            </View>
            <View style={styles.content}>
              <Text style={styles.name}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", paddingHorizontal: 18, paddingTop: 18 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 18 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 18, marginBottom: 12, flexDirection: "row", elevation: 3 },
  icon: { width: 50, height: 50, borderRadius: 14, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center", marginRight: 13 },
  emoji: { fontSize: 23 },
  content: { flex: 1 },
  name: { fontSize: 17, fontWeight: "900", color: "#172033" },
  message: { color: "#64748B", lineHeight: 20, marginTop: 6 },
  date: { color: "#2563EB", fontSize: 12, fontWeight: "800", marginTop: 9 },

  notice: { backgroundColor: "#FFF", borderRadius: 18, padding: 22, alignItems: "center", elevation: 2 },
  noticeTitle: { fontSize: 16, fontWeight: "800", color: "#172033" },
  noticeText: { color: "#64748B", textAlign: "center", marginTop: 6, lineHeight: 20 },
  retry: { marginTop: 14, backgroundColor: "#2563EB", paddingHorizontal: 22, paddingVertical: 11, borderRadius: 14 },
  retryText: { color: "#FFF", fontWeight: "800" },
});