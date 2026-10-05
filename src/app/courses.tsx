import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

type Subject = {
  id: number;
  code: string;
  name: string;
  units: number;
  instructor: string;
  description?: string;
};

type Course = {
  id: number;
  code: string; // e.g. "BSIT"
  name: string; // e.g. "Bachelor of Science in Information Technology"
  subjects: Subject[];
};

// Sample data — gamiton kung walay sulod o mag-error ang API
const SAMPLE_COURSES: Course[] = [
  {
    id: 1,
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    subjects: [
      {
        id: 101,
        code: "IT101",
        name: "Introduction to Computing",
        units: 3,
        instructor: "Prof. Juan Dela Cruz",
        description: "Basic concepts of computers, hardware, software, and IT careers.",
      },
      {
        id: 102,
        code: "IT102",
        name: "Computer Programming 1",
        units: 3,
        instructor: "Prof. Maria Santos",
        description: "Fundamentals of programming logic, syntax, and problem solving.",
      },
      {
        id: 103,
        code: "IT103",
        name: "Web Systems and Technologies",
        units: 3,
        instructor: "Prof. Mark Reyes",
        description: "Building web pages and apps using HTML, CSS, and JavaScript.",
      },
    ],
  },

  {
    id: 3,
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    subjects: [
      {
        id: 301,
        code: "BA101",
        name: "Principles of Management",
        units: 3,
        instructor: "Prof. Rosa Garcia",
        description: "Planning, organizing, leading, and controlling in organizations.",
      },
      {
        id: 302,
        code: "BA102",
        name: "Financial Accounting",
        units: 3,
        instructor: "Prof. Daniel Lopez",
        description: "Recording, analyzing, and reporting financial transactions.",
      },
      {
        id: 303,
        code: "BA103",
        name: "Marketing Management",
        units: 3,
        instructor: "Prof. Grace Tan",
        description: "Market research, consumer behavior, and marketing strategy.",
      },
    ],
  },
  {
    id: 4,
    code: "BEED",
    name: "Bachelor of Elementary Education",
    subjects: [
      {
        id: 401,
        code: "ED101",
        name: "Child and Adolescent Development",
        units: 3,
        instructor: "Prof. Maricel Flores",
        description: "Stages of growth and learning in children and adolescents.",
      },
      {
        id: 402,
        code: "ED102",
        name: "Teaching Strategies",
        units: 3,
        instructor: "Prof. Joel Navarro",
        description: "Methods and techniques for effective classroom instruction.",
      },
      {
        id: 403,
        code: "ED103",
        name: "Assessment of Learning",
        units: 3,
        instructor: "Prof. Elena Cruz",
        description: "Designing and using tests and other assessment tools.",
      },
    ],
  },
];

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<Course[]>("/courses")
      .then((r) => {
        const data = Array.isArray(r.data) ? r.data : [];
        // Siguroha nga naay subjects array ang matag course
        const clean = data
          .filter((c) => Array.isArray(c.subjects))
          .map((c) => ({ ...c, subjects: c.subjects }));
        setCourses(clean.length ? clean : SAMPLE_COURSES);
      })
      .catch((e) => {
        console.log(e);
        setCourses(SAMPLE_COURSES);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading courses..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>
      <Text style={styles.subtitle}>Tap a course to see its subjects</Text>

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

                        <Text style={[styles.label, styles.gap]}>Instructor</Text>
                        <Text style={styles.value}>{s.instructor}</Text>
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
  emptyText: { color: "#64748B", marginTop: 6 },
});