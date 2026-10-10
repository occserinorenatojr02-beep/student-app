import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import { useProfile } from "@/lib/profileStore";

// Programs shown on this screen, in display order
const PROGRAM_ORDER = ["BSIT", "BSBA", "BEED"];

//students shown for each program
const STUDENTS_PER_PROGRAM = 2;

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

// One student together with his/her own grades
type StudentGrades = {
  student: Student;
  grades: Grade[];
  failed: boolean; // true when this student's grades could not be loaded
};

// "Juan Dela Cruz" and "juan delacruz" both become "juandelacruz"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// "BSIT-2A" -> "BSIT"
const programOf = (s: Student) => (s.section || "").split("-")[0].trim().toUpperCase();

// Accepts either a plain array or a { data: [...] } wrapper
const toArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

const sortByCode = (list: Grade[]) =>
  [...list].sort((a, b) => String(a.course_code).localeCompare(String(b.course_code)));

// Weighted average by units
const computeGwa = (list: Grade[]) => {
  let points = 0;
  let units = 0;
  list.forEach((g) => {
    const n = Number(g.grade);
    const u = Number(g.units ?? 0);
    if (Number.isFinite(n) && u > 0) {
      points += n * u;
      units += u;
    }
  });
  return units > 0 ? (points / units).toFixed(2) : "—";
};

export default function Grades() {
  // Open with /grades?studentId=3 to show only that student.
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const profile = useProfile();

  const [blocks, setBlocks] = useState<StudentGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Ignore responses from the screen being closed or from an older request
  const mounted = useRef(true);
  const latest = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    const requestId = ++latest.current;
    const isStale = () => !mounted.current || requestId !== latest.current;

    // Student matching your Profile: student number first, then name
    const findProfileStudent = (list: Student[]) => {
      const byNumber = norm(profile.studentId)
        ? list.find((s) => norm(s.student_number) === norm(profile.studentId))
        : undefined;
      const byName = norm(profile.name)
        ? list.find((s) => norm(s.name) === norm(profile.name))
        : undefined;
      return byNumber ?? byName;
    };

    try {
      // 1. Decide which students to show
      let students: Student[] = [];

      if (studentId) {
        // A specific student was requested: fetch just that one
        try {
          const res = await api.get(`/students/${encodeURIComponent(studentId)}`);
          if (res.data && res.data.id != null) students = [res.data as Student];
        } catch (e) {
          // 404 means "no such student", anything else is a real error
          if (!(axios.isAxiosError(e) && e.response?.status === 404)) throw e;
        }
      } else {
        const res = await api.get("/students");
        const list = toArray<Student>(res.data);

        //profile student first so they are always picked
        const me = findProfileStudent(list);
        const ordered = me ? [me, ...list.filter((s) => s.id !== me.id)] : list;

        // First 2 students of each program
        students = PROGRAM_ORDER.flatMap((code) =>
          ordered.filter((s) => programOf(s) === code).slice(0, STUDENTS_PER_PROGRAM)
        );
      }

      //Load each student's OWN grades
      const results = await Promise.allSettled(
        students.map((s) => api.get(`/students/${s.id}/grades`))
      );

      if (isStale()) return;

      const loaded: StudentGrades[] = students.map((student, i) => {
        const r = results[i];
        return r.status === "fulfilled"
          ? { student, grades: sortByCode(toArray<Grade>(r.value.data)), failed: false }
          : { student, grades: [], failed: true };
      });

      // Every request failed -> treat it as a connection/server problem
      if (loaded.length > 0 && loaded.every((b) => b.failed)) {
        throw new Error("All grade requests failed");
      }

      setBlocks(loaded);
      setError(false);
    } catch (e) {
      console.log("GRADES ERROR:", e);
      // On a failed refresh the grades already on screen are kept
      if (!isStale()) setError(true);
    } finally {
      if (!isStale()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [studentId, profile.name, profile.studentId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) return <LoadingScreen message="Loading grades..." />;

  const emptyTitle = studentId ? "Student Not Found" : "No Students Found";
  const emptyText = studentId
    ? `No student record matches ID ${studentId}.`
    : "There are no student records available.";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grades</Text>
      <Text style={styles.subtitle}>Grades by subject</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
        }
      >
        {error && blocks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Unable to Load Grades</Text>
            <Text style={styles.emptyText}>
              Please check your connection and try again.{"\n"}Pull down to retry.
            </Text>
          </View>
        ) : blocks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{emptyTitle}</Text>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          blocks.map(({ student, grades, failed }) => {
            const displayName = String(student.name || "Student").trim();

            return (
              <View key={student.id} style={styles.block}>
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

                {failed ? (
                  <Text style={styles.note}>Unable to load grades for {displayName}.</Text>
                ) : grades.length === 0 ? (
                  <Text style={styles.note}>No grade records for {displayName}.</Text>
                ) : (
                  /* Grade table */
                  <View style={styles.table}>
                    <View style={[styles.tr, styles.thRow]}>
                      <Text style={[styles.th, styles.colCode]}>Code</Text>
                      <Text style={[styles.th, styles.colName]}>Subject</Text>
                      <Text style={[styles.th, styles.colGrade]}>Grade</Text>
                      <Text style={[styles.th, styles.colRemarks]}>Remarks</Text>
                    </View>

                    {grades.map((g, index) => {
                      const numeric = Number(g.grade);
                      const remarks = g.remarks || "Passed";
                      const isFailed = remarks.toLowerCase().includes("fail");

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
                              { color: isFailed ? "#DC2626" : "#16A34A" },
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
                      <Text style={styles.gwaValue}>{computeGwa(grades)}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB", padding: 18 },
  list: { paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: "900", color: "#172033" },
  subtitle: { color: "#64748B", marginTop: 4, marginBottom: 18 },

  block: { marginBottom: 22 },
  note: { color: "#64748B", textAlign: "center", paddingVertical: 14 },

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