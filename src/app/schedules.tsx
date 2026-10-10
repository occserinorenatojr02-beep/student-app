import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import { useProfile } from "@/lib/profileStore";

// true  -> show every course (BSIT, BSBA, BEED)
// false -> show only the course of the student that matches your Profile
const SHOW_ALL_COURSES = true;

// GET /programs
type Program = {
  id: number;
  code: string; // BSIT, BSBA, BEED
  name: string;
  department?: string;
  duration?: string;
};

// GET /students
type Student = {
  id: number;
  student_number: string;
  name: string;
  course: string;
  section: string; // e.g. "BSIT-3A"
};

// GET /courses (subject catalog: units, prerequisite, description)
type Course = {
  id: number;
  code: string;
  name: string;
  units?: number;
  prerequisite?: string;
  description?: string;
  program_code?: string;
};

// GET /schedules
type Schedule = {
  id: number;
  student_id?: number;
  program_code?: string;
  schedule_type?: string;
  code?: string;
  course_code?: string;
  subject?: string;
  course_name?: string;
  instructor?: string;
  days?: string[];
  day?: string;
  time?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
};

// One course together with its schedule entries
type ProgramSchedule = {
  program: Program;
  schedules: Schedule[];
  failed: boolean; 
};

type Row = {
  id: number;
  code: string;
  name: string;
  instructor: string;
  days: string[];
  dayShort: string;
  dayFull: string;
  start: string;
  end: string;
  room: string;
  units: number | null;
  prerequisite: string;
  description: string;
};

// One timetable schedule
type Track = {
  key: string; 
  type: string;
  rows: Row[];
  students: Student[];
};

type Group = {
  key: string; 
  name: string;
  failed: boolean;
  tracks: Track[];
};

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

const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const toArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];

// "BSIT-3A" -> "BSIT"
const programCode = (s: Student) => (s.section || "").split("-")[0].trim().toUpperCase();

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

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

const dayRank = (days: string[]) => {
  const i = days.length ? DAY_ORDER.indexOf(dayKey(days[0])) : -1;
  return i === -1 ? 99 : i;
};

const toMinutes = (t: string) => {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
};

const sortRows = (a: Row, b: Row) =>
  dayRank(a.days) - dayRank(b.days) ||
  toMinutes(a.start) - toMinutes(b.start) ||
  a.code.localeCompare(b.code);

const sumUnits = (rows: Row[]) => rows.reduce((sum, r) => sum + (r.units ?? 0), 0);

function buildHtml(title: string, subtitle: string, rows: Row[]) {
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
      <p class="sub">Opol Community College &bull; ${esc(title)}${subtitle ? " &bull; " + esc(subtitle) : ""}</p>
      <table>
        <tr><th>Code</th><th>Subject / Instructor</th><th>Units</th><th>Day</th><th>Time</th><th>Room</th></tr>
        ${body}
      </table>
      <p class="total"><b>Total units:</b> ${sumUnits(rows)}</p>
    </body>
  </html>`;
}

/* Screen */
export default function Schedules() {
  const profile = useProfile();
  const [blocks, setBlocks] = useState<ProgramSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
      // 1) Courses (programs), subject catalog and students load at the same time
      const [programsRes, coursesRes, studentsRes] = await Promise.allSettled([
        api.get("/programs"),
        api.get("/courses"),
        api.get("/students"),
      ]);

      // The program list is required
      if (programsRes.status === "rejected") throw programsRes.reason;

      const allPrograms = toArray<Program>(programsRes.value.data);
      const studentList =
        studentsRes.status === "fulfilled" ? toArray<Student>(studentsRes.value.data) : [];

      // When not showing everything, keep only the course of the student matching your Profile
      let selected = allPrograms;
      if (!SHOW_ALL_COURSES) {
        const me =
          (norm(profile.studentId)
            ? studentList.find((s) => norm(s.student_number) === norm(profile.studentId))
            : undefined) ??
          (norm(profile.name)
            ? studentList.find((s) => norm(s.name) === norm(profile.name))
            : undefined);

        selected = me ? allPrograms.filter((p) => p.code.toUpperCase() === programCode(me)) : [];
      }

      //Load the schedule of EACH course: GET /schedules?program=BSIT
      const results = await Promise.allSettled(
        selected.map((p) => api.get("/schedules", { params: { program: p.code } }))
      );

      if (isStale()) return;

      const loaded: ProgramSchedule[] = selected.map((program, i) => {
        const r = results[i];
        return r.status === "fulfilled"
          ? { program, schedules: toArray<Schedule>(r.value.data), failed: false }
          : { program, schedules: [], failed: true };
      });

      if (loaded.length > 0 && loaded.every((b) => b.failed)) {
        throw new Error("All schedule requests failed");
      }

      if (coursesRes.status === "fulfilled") {
        setCourses(toArray<Course>(coursesRes.value.data));
      } else {
        console.log("COURSES ERROR:", coursesRes.reason);
      }

      setStudents(studentList);
      setBlocks(loaded);
      setError(false);
    } catch (e) {
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

  const courseByCode = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((c) => map.set(norm(c.code), c));
    return map;
  }, [courses]);

  // Each course -> its timetables -> rows + the students using it
  const groups = useMemo<Group[]>(() => {
    const studentById = new Map<number, Student>();
    students.forEach((s) => studentById.set(s.id, s));

    return blocks.map(({ program, schedules, failed }) => {
      // Split the course's entries by timetable type
      const byType = new Map<string, Schedule[]>();
      schedules.forEach((s) => {
        const type = (s.schedule_type || "A").toUpperCase();
        if (!byType.has(type)) byType.set(type, []);
        byType.get(type)!.push(s);
      });

      const tracks: Track[] = Array.from(byType.keys())
        .sort()
        .map((type) => {
          const entries = byType.get(type)!;

          // Everyone on the same timetable has identical subjects, so use the first student's entries
          const firstId = entries[0]?.student_id;
          const unique = firstId === undefined ? entries : entries.filter((e) => e.student_id === firstId);

          const rows = unique
            .map((s) => toRow(s, courseByCode.get(norm(s.code ?? s.course_code))))
            .sort(sortRows);

          const ids = Array.from(
            new Set(entries.map((e) => e.student_id).filter((id): id is number => id !== undefined))
          );
          const trackStudents = ids
            .map((id) => studentById.get(id))
            .filter((s): s is Student => !!s);

          return { key: `${program.code}-${type}`, type, rows, students: trackStudents };
        });

      return { key: program.code.toUpperCase(), name: program.name, failed, tracks };
    });
  }, [blocks, students, courseByCode]);

  const download = async (group: Group, track: Track) => {
    setDownloadingKey(track.key);
    const html = buildHtml(group.name, `Schedule ${track.type}`, track.rows);

    try {
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error("No PDF data returned");

      const pdf = new File(Paths.cache, `Class-Schedule-${track.key}.pdf`);
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

      try {
        await Print.printAsync({ html });
      } catch (printError) {
        console.log("PRINT ERROR:", printError);
        Alert.alert("Download failed", "Unable to create the PDF. Please try again.");
      }
    } finally {
      setDownloadingKey(null);
    }
  };

  if (loading) return <LoadingScreen message="Loading class schedule..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Schedule</Text>
      <Text style={styles.subtitle}>Time table by course</Text>

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
              {SHOW_ALL_COURSES
                ? "No class schedule is available."
                : `No course matches ${String(profile.name || "Student").trim()}.`}
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
                    {group.tracks.length} {group.tracks.length === 1 ? "schedule" : "schedules"}
                  </Text>
                </View>

                {group.failed ? (
                  <Text style={styles.note}>Unable to load the schedule of {group.key}.</Text>
                ) : group.tracks.length === 0 ? (
                  <Text style={styles.note}>No class schedule for {group.key}.</Text>
                ) : (
                  group.tracks.map((track) => {
                    const totalUnits = sumUnits(track.rows);
                    const downloading = downloadingKey === track.key;
                    const names = track.students.map((s) => s.name).join(", ");

                    return (
                      <View key={track.key} style={styles.block}>
                        {/* Timetable card */}
                        <View style={styles.studentCard}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{track.type}</Text>
                          </View>
                          <View style={styles.headerInfo}>
                            <Text style={styles.studentName}>Schedule {track.type}</Text>
                            {!!names && (
                              <Text style={styles.studentNumber} numberOfLines={2}>{names}</Text>
                            )}
                            <Text style={styles.studentStats}>
                              {track.rows.length} subjects{totalUnits > 0 ? ` • ${totalUnits} units` : ""}
                            </Text>
                          </View>
                        </View>

                        {/* Time table */}
                        <View style={styles.table}>
                          <View style={[styles.tr, styles.thRow]}>
                            <Text style={[styles.th, styles.colSubject]}>Subject</Text>
                            <Text style={[styles.th, styles.colDay, styles.thCenter]}>Day</Text>
                            <Text style={[styles.th, styles.colTime, styles.thRight]}>Time</Text>
                          </View>

                          {track.rows.map((r, index) => {
                            const rowKey = `${track.key}-${r.id}`;
                            const open = openId === rowKey;
                            const hasDetails = !!r.description || !!r.prerequisite;

                            return (
                              <View key={rowKey} style={index % 2 === 1 && styles.trAlt}>
                                <TouchableOpacity
                                  activeOpacity={hasDetails ? 0.7 : 1}
                                  style={styles.tr}
                                  onPress={() => hasDetails && setOpenId(open ? null : rowKey)}
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
                          onPress={() => download(group, track)}
                          disabled={downloadingKey !== null}
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
                      </View>
                    );
                  })
                )}
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

  group: { marginBottom: 10 },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  groupPill: { backgroundColor: "#2563EB", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginRight: 10 },
  groupCode: { color: "#FFF", fontWeight: "900", fontSize: 12 },
  groupName: { flex: 1, color: "#172033", fontWeight: "800", fontSize: 15 },
  groupCount: { color: "#64748B", fontSize: 12, marginLeft: 8 },

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