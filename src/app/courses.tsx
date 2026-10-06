import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

// GET /programs -> degree programs
type Program = {
  id: number;
  code: string; // e.g. "BSIT"
  name: string; // e.g. "Bachelor of Science in Information Technology"
};

// GET /courses -> subjects, each tagged with the program it belongs to
type Subject = {
  id: number;
  code: string;
  name: string;
  units: number;
  instructor: string;
  description?: string;
  program_code?: string;
};

// What the screen shows: a program with its subjects
type Course = {
  id: number;
  code: string;
  name: string;
  subjects: Subject[];
};

const toArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response) return `Server error (${error.response.status}). Please try again.`;
    if (error.request) return "Cannot reach the server. Check your connection and the API address.";
  }
  return "Something went wrong while loading courses.";
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  // Prevents state updates if the screen is closed while requests are running
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      // Fetch programs and subjects together, then group subjects under their program
      const [programsRes, subjectsRes] = await Promise.all([
        api.get("/programs"),
        api.get("/courses"),
      ]);

      const programs = toArray<Program>(programsRes.data);
      const subjects = toArray<Subject>(subjectsRes.data);

      const grouped: Course[] = programs.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        subjects: subjects.filter((s) => s.program_code === p.code),
      }));

      if (!mounted.current) return;
      setCourses(grouped);
      setError(null);
    } catch (err) {
      console.log("COURSES ERROR:", err);
      if (!mounted.current) return;
      // Keep the old list on a failed refresh, only show the error message
      setError(getErrorMessage(err));
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  if (loading) return <LoadingScreen message="Loading courses..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses and Subjects</Text>
      <Text style={styles.subtitle}>Tap a course to see its subjects</Text>

      <FlatList
        data={courses}
        keyExtractor={(item) => String(item.id)}
        extraData={openId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{error ? "Unable to Load Courses" : "No Courses Found"}</Text>
            <Text style={styles.emptyText}>
              {error ? `${error}\nPull down to try again.` : "No courses are available right now."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const open = openId === item.id;
          const totalUnits = item.subjects.reduce((sum, s) => sum + (Number(s.units) || 0), 0);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => setOpenId(open ? null : item.id)}
            >
              {/* Always visible: code + course name */}
              <View style={styles.topRow}>
                <View style={styles.codePill}>
                  <Text style={styles.code}>{item.code}</Text>
                </View>
                <Ionicons name={open ? "chevron-up" : "chevron-down"} size={22} color="#2563EB" />
              </View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.subjects.length} subjects • {totalUnits} units
              </Text>

              {/* Shown after tapping: list of Course Subjects */}
              {open && (
                <View style={styles.details}>
                  <Text style={styles.sectionTitle}>Course Subjects</Text>

                  {item.subjects.length === 0 ? (
                    <Text style={styles.description}>No subjects available.</Text>
                  ) : (
                    item.subjects.map((s) => (
                      <View key={s.id} style={styles.subjectCard}>
                        <View style={styles.subjectTop}>
                          <Text style={styles.subjectCode}>{s.code}</Text>
                          <Text style={styles.unitsBadge}>
                            {s.units} {Number(s.units) === 1 ? "unit" : "units"}
                          </Text>
                        </View>
                        <Text style={styles.subjectName}>{s.name}</Text>

                        <Text style={[styles.label, styles.gap]}>Description</Text>
                        <Text style={styles.description}>
                          {s.description || "No description available."}
                        </Text>
                      </View>
                    ))
                  )}
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
  meta: { color: "#64748B", fontSize: 13, marginTop: 4 },

  details: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#EEF2F7" },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: "#172033", marginBottom: 10 },

  subjectCard: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 14, marginBottom: 10 },
  subjectTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subjectCode: { color: "#2563EB", fontWeight: "900", fontSize: 13 },
  unitsBadge: {
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    fontWeight: "800",
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  subjectName: { fontSize: 15.5, fontWeight: "800", color: "#172033", marginTop: 6 },

  label: { fontSize: 10, color: "#94A3B8", fontWeight: "800", textTransform: "uppercase" },
  gap: { marginTop: 12 },
  value: { color: "#334155", fontSize: 15, fontWeight: "600", marginTop: 4 },
  description: { color: "#334155", fontSize: 14, lineHeight: 21, marginTop: 4 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#172033" },
  emptyText: { color: "#64748B", marginTop: 6, textAlign: "center" },
});