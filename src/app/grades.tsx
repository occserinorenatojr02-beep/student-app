import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import { useProfile } from "@/lib/profileStore";

type Student = {
  id: number;
  student_number: string;
  name: string;
  section: string;
};

type Grade = {
  id: number;
  student_id: number;
  course_code?: string;
  course_name?: string;
  units?: number;
  grade?: number | string;
  remarks?: string;
};

// "Juan Dela Cruz" and "juan delacruz" both become "juandelacruz"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function Grades() {
  // Open with /grades?studentId=3 to show another student.
  // Without it, the student from your Profile is shown.
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const profile = useProfile();

  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(false);

      try {
        const studentsResponse = await api.get<Student[]>("/students");
        const list = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];

        // 1. Find the student by id (or by profile)
        const found = studentId
          ? list.find((s) => Number(s.id) === Number(studentId))
          : list.find((s) => norm(s.name) === norm(profile.name)) ??
            list.find((s) => norm(s.student_number) === norm(profile.studentId));

        if (!found) {
          if (active) {
            setStudent(null);
            setGrades([]);
          }
          return;
        }

        // 2. Load ONLY that student's grades
        const gradesResponse = await api.get<Grade[]>(`/students/${found.id}/grades`);
        const own = Array.isArray(gradesResponse.data) ? gradesResponse.data : [];

        if (active) {
          setStudent(found);
          setGrades(own);
        }
      } catch (e) {
        console.log("GRADES ERROR:", e);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [studentId, profile.name, profile.studentId]);

  const sorted = useMemo(
    () => [...grades].sort((a, b) => String(a.course_code).localeCompare(String(b.course_code))),
    [grades]
  );

  // Weighted average by units
  const gwa = useMemo(() => {
    let points = 0;
    let units = 0;
    sorted.forEach((g) => {
      const n = Number(g.grade);
      const u = Number(g.units ?? 0);
      if (Number.isFinite(n) && u > 0) {
        points += n * u;
        units += u;
      }
    });
    return units > 0 ? (points / units).toFixed(2) : "—";
  }, [sorted]);

  if (loading) return <LoadingScreen message="Loading grades..." />;

  const displayName = String(student?.name || profile.name || "Student").trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grades</Text>
      <Text style={styles.subtitle}>Grades by subject</Text>

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Unable to Load Grades</Text>
          <Text style={styles.emptyText}>Please check your connection and try again.</Text>
        </View>
      ) : !student ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Student Not Found</Text>
          <Text style={styles.emptyText}>No student record matches {displayName}.</Text>
        </View>
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Grades Found</Text>
          <Text style={styles.emptyText}>No grade records for {displayName}.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {/* Student card */}
          <View style={styles.studentCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.studentName}>{displayName}</Text>
              <Text style={styles.studentNumber}>
                {student.student_number} • {student.section}
              </Text>
            </View>
          </View>

          {/* Grade table */}
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colCode]}>Code</Text>
              <Text style={[styles.th, styles.colName]}>Subject</Text>
              <Text style={[styles.th, styles.colGrade]}>Grade</Text>
              <Text style={[styles.th, styles.colRemarks]}>Remarks</Text>
            </View>

            {sorted.map((g, index) => {
              const numeric = Number(g.grade);
              const remarks = g.remarks || "Passed";
              const failed = remarks.toLowerCase().includes("fail");

              return (
                <View key={g.id} style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                  <Text style={[styles.code, styles.colCode]}>{g.course_code || "—"}</Text>
                  <View style={styles.colName}>
                    <Text style={styles.course}>{g.course_name || "Subject name unavailable"}</Text>
                    <Text style={styles.units}>{g.units ?? 0} units</Text>
                  </View>
                  <Text style={[styles.gradeText, styles.colGrade]}>
                    {Number.isFinite(numeric) ? numeric.toFixed(2) : "—"}
                  </Text>
                  <Text
                    style={[
                      styles.remarks,
                      styles.colRemarks,
                      { color: failed ? "#DC2626" : "#16A34A" },
                    ]}
                  >
                    {remarks}
                  </Text>
                </View>
              );
            })}

            {/* Footer */}
            <View style={[styles.tr, styles.tfRow]}>
              <Text style={styles.gwaLabel}>General Weighted Average</Text>
              <Text style={styles.gwaValue}>{gwa}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", padding: 18 },
  list: { paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 18 },

  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  headerInfo: { flex: 1 },
  studentName: { fontSize: 17, fontWeight: "900", color: "#172033" },
  studentNumber: { color: "#2563EB", fontSize: 12, fontWeight: "700", marginTop: 3 },

  table: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    overflow: "hidden",
    elevation: 3,
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trAlt: { backgroundColor: "#F8FAFC" },
  thRow: { backgroundColor: "#EFF6FF", paddingVertical: 10 },
  th: { color: "#2563EB", fontSize: 11.5, fontWeight: "900" },
  tfRow: {
    backgroundColor: "#2563EB",
    justifyContent: "space-between",
    borderBottomWidth: 0,
    paddingVertical: 14,
  },

  colCode: { width: 56 },
  colName: { flex: 1, paddingRight: 8 },
  colGrade: { width: 52, textAlign: "center" },
  colRemarks: { width: 62, textAlign: "right" },

  code: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  course: { color: "#172033", fontSize: 13.5, fontWeight: "700" },
  units: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  gradeText: { fontSize: 16, fontWeight: "900", color: "#2563EB" },
  remarks: { fontSize: 12, fontWeight: "700" },

  gwaLabel: { color: "#DBEAFE", fontWeight: "800", fontSize: 13 },
  gwaValue: { color: "#FFF", fontWeight: "900", fontSize: 20 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#172033" },
  emptyText: { color: "#64748B", marginTop: 6, textAlign: "center" },
});