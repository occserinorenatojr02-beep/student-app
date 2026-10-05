import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import axios from "axios";

type Student = {
  id: number; student_number: string; name: string; course: string; year_level: number;
  section: string; email: string; phone: string; status: string; gender: string;
  birth_date: string; address: string; guardian: string; guardian_phone: string;
};

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStudents = async () => {
    try {
      const response = await api.get<Student[]>("/students");
      setStudents(response.data);
    } catch (error) {
      console.log("STUDENTS ERROR:", error);
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);

  if (loading) return <LoadingScreen message="Loading student directory..." />;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStudents(); }} colors={["#2563EB"]} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Students</Text>
              <Text style={styles.subtitle}>Student Directory</Text>
            </View>
            <View style={styles.count}>
              <Text style={styles.countNumber}>{students.length}</Text>
              <Text style={styles.countLabel}>Students</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👨‍🎓</Text>
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptyText}>There are currently no students available.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push(`/student/${item.id}`)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.number}>{item.student_number}</Text>
              <Text style={styles.course} numberOfLines={1}>{item.course}</Text>
              <Text style={styles.section}>Year {item.year_level} • {item.section}</Text>
            </View>
            <View style={styles.right}>
              <View style={styles.status}><Text style={styles.statusText}>{item.status}</Text></View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  list: { padding: 16, paddingBottom: 30 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4 },
  count: { backgroundColor: "#DBEAFE", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, alignItems: "center" },
  countNumber: { color: "#2563EB", fontSize: 18, fontWeight: "900" },
  countLabel: { color: "#64748B", fontSize: 10 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 15, marginBottom: 12, flexDirection: "row", alignItems: "center", elevation: 3 },
  avatar: { width: 55, height: 55, borderRadius: 28, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  info: { flex: 1, marginLeft: 13, marginRight: 8 },
  name: { fontSize: 17, fontWeight: "900", color: "#172033" },
  number: { color: "#2563EB", fontSize: 12, fontWeight: "700", marginTop: 2 },
  course: { color: "#64748B", fontSize: 12, marginTop: 5 },
  section: { color: "#94A3B8", fontSize: 12, marginTop: 3 },
  right: { alignItems: "center" },
  status: { backgroundColor: "#DCFCE7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { color: "#15803D", fontSize: 10, fontWeight: "800" },
  arrow: { color: "#94A3B8", fontSize: 28, lineHeight: 30, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 100, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 55 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#172033", marginTop: 15 },
  emptyText: { color: "#64748B", textAlign: "center", marginTop: 8 },
});
