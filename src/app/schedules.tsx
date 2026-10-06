import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import { useProfile } from "@/lib/profileStore";

// true  -> show every student, grouped by course
// false -> show only the student that matches your Profile (still under his/her course)
const SHOW_ALL_STUDENTS = true;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

// GET /students
type Student = {
  id: number;
  student_number: string;
  name: string;
  course: string; // e.g. "Bachelor of Science in Information Technology"
  section: string; // e.g. "BSIT-3A"
};

// GET /courses  (the subject catalog: units, prerequisite, description)
type Course = {
  id: number;
  code: string;
  name: string;
  units?: number;
  prerequisite?: string;
  description?: string;
  program_code?: string;
};

// GET /students/{id}/schedules
// Supports the API fields (code, subject, days, time) and the older ones (course_code, course_name, day, start_time, end_time)
type Schedule = {
  id: number;
  student_id?: number;
  program_code?: string;
  code?: string;
  course_code?: string;
  subject?: string;
  course_name?: string;
  instructor?: string;
  days?: string[]; // e.g. ["Monday", "Wednesday", "Friday"]
  day?: string; // e.g. "Mon / Wed / Fri" or "Monday"
  time?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
};

// One student together with his/her own timetable
type StudentSchedule = {
  student: Student;
  schedules: Schedule[];
  failed: boolean; // true when this student's schedule could not be loaded
};

// One timetable row = a schedule entry joined with its course
type Row = {
  id: number;
  code: string;
  name: string;
  instructor: string;
  days: string[];
  dayShort: string; // MWF, TTh, TThS
  dayFull: string; // Mon / Wed / Fri
  start: string;
  end: string;
  room: string;
  units: number | null;
  prerequisite: string;
  description: string;
};

// One course (program) with its students
type Group = {
  key: string; // BSIT, BSBA, BEED
  name: string;
  items: { student: Student; rows: Row[]; failed: boolean }[];
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Keyed by the first 3 letters of the day, so "Mon", "Monday" and "monday" all work
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LETTER: Record<string, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "Th",
  fri: "F",
  sat: "S",
  sun: "Su",
};

const dayKey = (d: string) => d.trim().toLowerCase().slice(0, 3);

// "Juan Dela Cruz" and "juan delacruz" both become "juandelacruz"
// "IT 201" and "IT201" both become "it201"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Accepts either a plain array or a { data: [...] } wrapper
const toArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

// "BSIT-3A" -> "BSIT"
const programCode = (s: Student) => (s.section || "").split("-")[0].trim().toUpperCase() || "COURSE";

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// base64 string -> bytes (used to write the PDF without reading the printed file)
const base64ToBytes = (b64: string) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

function toRow(s: Schedule, course?: Course): Row {
  const full = s.time ?? [s.start_time, s.end_time].filter(Boolean).join(" - ");
  const [start = "", end = ""] = full.split(/\s+-\s+/);

  const days = (s.days?.length ? s.days : s.day ? s.day.split(/\s*[\/,&]\s*/) : [])
    .map((d) => d.trim())
    .filter(Boolean);

  const prereq = (course?.prerequisite || "").trim();

  return {
    id: s.id,
    code: s.code ?? s.course_code ?? course?.code ?? "Subject",
    name: s.subject ?? s.course_name ?? course?.name ?? "Subject name unavailable",
    instructor: s.instructor || "TBA",
    days,
    dayShort: days.length ? days.map((d) => DAY_LETTER[dayKey(d)] ?? d.slice(0, 2)).join("") : "TBA",
    dayFull: days.length ? days.map((d) => d.slice(0, 3)).join(" / ") : "TBA",
    start,
    end,
    room: s.room || "Room TBA",
    units: typeof course?.units === "number" ? course.units : null,
    prerequisite: prereq && prereq.toLowerCase() !== "none" ? prereq : "",
    description: course?.description || "",
  };
}

// Position of the first meeting day in the week; unknown days go last
const dayRank = (days: string[]) => {
  const i = days.length ? DAY_ORDER.indexOf(dayKey(days[0])) : -1;
  return i === -1 ? 99 : i;
};

// "1:00 PM" -> minutes since midnight, so classes sort by time of day
const toMinutes = (t: string) => {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
};

// MWF classes first (by time), then TTh / TThS classes (by time)
const sortRows = (a: Row, b: Row) =>
  dayRank(a.days) - dayRank(b.days) ||
  toMinutes(a.start) - toMinutes(b.start) ||
  a.code.localeCompare(b.code);

const sumUnits = (rows: Row[]) => rows.reduce((sum, r) => sum + (r.units ?? 0), 0);

function buildHtml(name: string, section: string, rows: Row[]) {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td><b>${esc(r.code)}</b></td>
        <td>${esc(r.name)}<br/><span class="muted">${esc(r.instructor)}</span></td>
        <td>${r.units ?? "-"}</td>
        <td>${esc(r.dayFull)}</td>
        <td>${esc(r.start)}${r.end ? " - " + esc(r.end) : ""}</td>
        <td>${esc(r.room)}</td>
      </tr>`
    )
    .join("");

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, Helvetica, sans-serif; padding: 28px; color: #172033; }
        h1 { color: #2563EB; margin: 0 0 4px; font-size: 24px; }
        .sub { color: #64748B; margin: 0 0 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #2563EB; color: #fff; text-align: left; padding: 10px; }
        td { padding: 10px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
        tr:nth-child(even) td { background: #F8FAFC; }
        .muted { color: #64748B; font-size: 12px; }
        .total { margin-top: 14px; font-size: 13px; color: #172033; text-align: right; }
      </style>
    </head>
    <body>
      <h1>Class Schedule</h1>
      <p class="sub">Opol Community College &bull; ${esc(name)}${section ? " &bull; " + esc(section) : ""}</p>
      <table>
        <tr><th>Code</th><th>Subject / Instructor</th><th>Units</th><th>Day</th><th>Time</th><th>Room</th></tr>
        ${body}
      </table>
      <p class="total"><b>Total units:</b> ${sumUnits(rows)}</p>
    </body>
  </html>`;
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function Schedules() {
  const profile = useProfile();
  const [blocks, setBlocks] = useState<StudentSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

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

    try {
      // 1) Students + courses are independent, so load them at the same time
      const [studentsRes, coursesRes] = await Promise.allSettled([
        api.get("/students"),
        api.get("/courses"),
      ]);

      // The student list is required
      if (studentsRes.status === "rejected") throw studentsRes.reason;

      const list = toArray<Student>(studentsRes.value.data);

      // Student matching your Profile: student number first, then name
      const byNumber = norm(profile.studentId)
        ? list.find((s) => norm(s.student_number) === norm(profile.studentId))
        : undefined;
      const byName = norm(profile.name)
        ? list.find((s) => norm(s.name) === norm(profile.name))
        : undefined;
      const me = byNumber ?? byName;

      const selected = SHOW_ALL_STUDENTS ? list : me ? [me] : [];

      // 2) Load each student's OWN timetable: GET /students/{id}/schedules
      const results = await Promise.allSettled(
        selected.map((s) => api.get(`/students/${s.id}/schedules`))
      );

      if (isStale()) return;

      const loaded: StudentSchedule[] = selected.map((student, i) => {
        const r = results[i];
        return r.status === "fulfilled"
          ? { student, schedules: toArray<Schedule>(r.value.data), failed: false }
          : { student, schedules: [], failed: true };
      });

      // Every request failed -> treat it as a connection/server problem
      if (loaded.length > 0 && loaded.every((b) => b.failed)) {
        throw new Error("All schedule requests failed");
      }

      // Courses are only extra details (units, prerequisite, description), so a failure is not fatal
      if (coursesRes.status === "fulfilled") {
        setCourses(toArray<Course>(coursesRes.value.data));
      } else {
        console.log("COURSES ERROR:", coursesRes.reason);
      }

      setBlocks(loaded);
      setError(false);
    } catch (e) {
      // Keep the old schedule on a failed refresh, only flag the error
      console.log("SCHEDULES ERROR:", e);
      if (!isStale()) setError(true);
    } finally {
      if (!isStale()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profile.name, profile.studentId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Course lookup by code, so each schedule entry can pick up its units / prerequisite / description
  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(norm(c.code), c));
    return map;
  }, [courses]);

  // Students divided by course (BSIT, BSBA, BEED), each with his/her own timetable rows
  const groups = useMemo(() => {
    const map = new Map<string, Group>();

    blocks.forEach(({ student, schedules, failed }) => {
      const key = programCode(student);

      if (!map.has(key)) {
        map.set(key, { key, name: student.course || key, items: [] });
      }

      const rows = schedules
        .map((s) => toRow(s, courseByCode.get(norm(s.code ?? s.course_code))))
        .sort(sortRows);

      map.get(key)!.items.push({ student, rows, failed });
    });

    return Array.from(map.values());
  }, [blocks, courseByCode]);

  const download = async (student: Student, rows: Row[]) => {
    setDownloadingId(student.id);
    const html = buildHtml(String(student.name || "Student").trim(), student.section || "", rows);

    try {
      // Ask for the PDF as base64 so we never have to read the printed file
      // (reading it triggers "Missing 'READ' permission" on some devices).
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error("No PDF data returned");

      // Write the bytes into our own cache file, which we always have access to.
      const pdf = new File(Paths.cache, `Class-Schedule-${student.id}.pdf`);
      if (pdf.exists) pdf.delete();
      pdf.create();
      pdf.write(base64ToBytes(base64));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdf.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save class schedule",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Schedule saved", `PDF saved at:\n${pdf.uri}`);
      }
    } catch (e) {
      console.log("DOWNLOAD ERROR:", e);

      // Fallback: open the system print dialog, which has "Save as PDF"
      try {
        await Print.printAsync({ html });
      } catch (printError) {
        console.log("PRINT ERROR:", printError);
        Alert.alert("Download failed", "Unable to create the PDF. Please try again.");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <LoadingScreen message="Loading class schedule..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Schedule</Text>
      <Text style={styles.subtitle}>Time table by subject</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} />
        }
      >
        {error && blocks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Unable to Load Schedule</Text>
            <Text style={styles.emptyText}>
              Please check your connection and try again.{"\n"}Pull down to retry.
            </Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No Schedule Found</Text>
            <Text style={styles.emptyText}>
              {SHOW_ALL_STUDENTS
                ? "No class schedule is available."
                : `No student record matches ${String(profile.name || "Student").trim()}.`}
            </Text>
          </View>
        ) : (
          <>
            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                {/* Course header */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupPill}>
                    <Text style={styles.groupCode}>{group.key}</Text>
                  </View>
                  <Text style={styles.groupName} numberOfLines={2}>{group.name}</Text>
                  <Text style={styles.groupCount}>
                    {group.items.length} {group.items.length === 1 ? "student" : "students"}
                  </Text>
                </View>

                {group.items.map(({ student, rows, failed }) => {
                  const displayName = String(student.name || "Student").trim();
                  const totalUnits = sumUnits(rows);
                  const downloading = downloadingId === student.id;

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
                            {[student.student_number, student.section].filter(Boolean).join(" • ") || "Student"}
                          </Text>
                          {!failed && rows.length > 0 && (
                            <Text style={styles.studentStats}>
                              {rows.length} subjects{totalUnits > 0 ? ` • ${totalUnits} units` : ""}
                            </Text>
                          )}
                        </View>
                      </View>

                      {failed ? (
                        <Text style={styles.note}>Unable to load the schedule of {displayName}.</Text>
                      ) : rows.length === 0 ? (
                        <Text style={styles.note}>No class schedule for {displayName}.</Text>
                      ) : (
                        <>
                          {/* Time table */}
                          <View style={styles.table}>
                            <View style={[styles.tr, styles.thRow]}>
                              <Text style={[styles.th, styles.colSubject]}>Subject</Text>
                              <Text style={[styles.th, styles.colDay, styles.thCenter]}>Day</Text>
                              <Text style={[styles.th, styles.colTime, styles.thRight]}>Time</Text>
                            </View>

                            {rows.map((r, index) => {
                              const open = openId === r.id;
                              const hasDetails = !!r.description || !!r.prerequisite;

                              return (
                                <View key={r.id} style={index % 2 === 1 && styles.trAlt}>
                                  <TouchableOpacity
                                    activeOpacity={hasDetails ? 0.7 : 1}
                                    style={styles.tr}
                                    onPress={() => hasDetails && setOpenId(open ? null : r.id)}
                                  >
                                    <View style={styles.colSubject}>
                                      <Text style={styles.code}>
                                        {r.code}
                                        {r.units !== null ? `  •  ${r.units} ${r.units === 1 ? "unit" : "units"}` : ""}
                                      </Text>
                                      <Text style={styles.course}>{r.name}</Text>
                                      <Text style={styles.meta}>{r.room} • {r.instructor}</Text>
                                    </View>
                                    <Text style={[styles.day, styles.colDay]}>{r.dayShort}</Text>
                                    <View style={styles.colTime}>
                                      <Text style={styles.timeText}>{r.start}</Text>
                                      {!!r.end && <Text style={styles.timeEnd}>{r.end}</Text>}
                                    </View>
                                  </TouchableOpacity>

                                  {/* Course details from /courses (tap a subject to show / hide) */}
                                  {open && (
                                    <View style={styles.detail}>
                                      {!!r.prerequisite && (
                                        <Text style={styles.detailPrereq}>Prerequisite: {r.prerequisite}</Text>
                                      )}
                                      {!!r.description && <Text style={styles.detailText}>{r.description}</Text>}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>

                          {/* Download */}
                          <TouchableOpacity
                            style={styles.download}
                            activeOpacity={0.85}
                            onPress={() => download(student, rows)}
                            disabled={downloadingId !== null}
                          >
                            {downloading ? (
                              <ActivityIndicator color="#FFF" />
                            ) : (
                              <>
                                <Ionicons name="download-outline" size={20} color="#FFF" />
                                <Text style={styles.downloadText}>Download Schedule (PDF)</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}

            <Text style={styles.hint}>Tap a subject to see its course details.</Text>
          </>
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

  // Course (program) group
  group: { marginBottom: 10 },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  groupPill: { backgroundColor: "#2563EB", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 10 },
  groupCode: { color: "#FFF", fontWeight: "900", fontSize: 12 },
  groupName: { flex: 1, color: "#172033", fontWeight: "800", fontSize: 15 },
  groupCount: { color: "#64748B", fontSize: 12, marginLeft: 8 },

  // One student inside a group
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
  studentStats: { color: "#64748B", fontSize: 12, marginTop: 3 },

  table: { backgroundColor: "#FFF", borderRadius: 18, overflow: "hidden", elevation: 3 },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  trAlt: { backgroundColor: "#F8FAFC" },
  thRow: { backgroundColor: "#EFF6FF", paddingVertical: 10 },
  th: { color: "#2563EB", fontSize: 11.5, fontWeight: "900" },
  thCenter: { textAlign: "center" },
  thRight: { textAlign: "right" },

  colSubject: { flex: 1, paddingRight: 8 },
  colDay: { width: 44, textAlign: "center" },
  colTime: { width: 72, alignItems: "flex-end" },

  code: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  course: { color: "#172033", fontSize: 14, fontWeight: "800", marginTop: 3 },
  meta: { color: "#94A3B8", fontSize: 11, marginTop: 4 },
  day: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  timeText: { color: "#172033", fontSize: 12, fontWeight: "700" },
  timeEnd: { color: "#64748B", fontSize: 12, marginTop: 2 },

  detail: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailPrereq: { color: "#2563EB", fontSize: 12, fontWeight: "800", marginBottom: 4 },
  detailText: { color: "#475569", fontSize: 12.5, lineHeight: 18 },
  hint: { color: "#94A3B8", fontSize: 11.5, textAlign: "center", marginTop: 4 },

  download: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 16,
  },
  downloadText: { color: "#FFF", fontWeight: "800", fontSize: 15 },

  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#172033" },
  emptyText: { color: "#64748B", marginTop: 6, textAlign: "center" },
});