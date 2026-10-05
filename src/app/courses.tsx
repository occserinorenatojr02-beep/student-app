import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

type Course = {
  id: number;
  code: string;
  name: string;
  units: number;
  instructor: string;
  description?: string;
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Course[]>("/courses")
      .then((r) => setCourses(Array.isArray(r.data) ? r.data : []))
      .catch(console.log)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading courses..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>
      <Text style={styles.subtitle}>Tap a course to see its details</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        extraData={openId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Courses Found</Text>
            <Text style={styles.emptyText}>No courses are available right now.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const open = openId === item.id;

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setOpenId(open ? null : item.id)}
            >
              {/* Always visible: code + name */}
              <View style={styles.topRow}>
                <View style={styles.codePill}>
                  <Text style={styles.code}>{item.code}</Text>
                </View>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color="#2563EB" />
              </View>
              <Text style={styles.name}>{item.name}</Text>

              {/* Shown after tapping: units, description, instructor */}
              {open && (
                <View style={styles.details}>
                  <Text style={styles.label}>Units</Text>
                  <Text style={styles.value}>{item.units}</Text>

                  <Text style={[styles.label, styles.gap]}>Description</Text>
                  <Text style={styles.description}>
                    {item.description || "No description available."}
                  </Text>

                  <Text style={[styles.label, styles.gap]}>Instructor</Text>
                  <Text style={styles.value}>{item.instructor}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", padding: 18 },
  list: { paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 18 },

  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 18, marginBottom: 12, elevation: 3 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  codePill: { backgroundColor: "#2563EB", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  code: { color: "#FFF", fontWeight: "900", fontSize: 12 },
  name: { fontSize: 17, fontWeight: "800", color: "#172033", marginTop: 12 },

  details: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#EEF2F7" },
  label: { fontSize: 10, color: "#94A3B8", fontWeight: "800", textTransform: "uppercase" },
  gap: { marginTop: 14 },
  value: { color: "#334155", fontSize: 15, fontWeight: "600", marginTop: 4 },
  description: { color: "#334155", fontSize: 14.5, lineHeight: 22, marginTop: 6 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#172033" },
  emptyText: { color: "#64748B", marginTop: 6 },
});