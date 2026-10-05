import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";
import { useProfile } from "@/lib/profileStore";

type Student = {
  id: number;
  student_number: string;
  name: string;
  section: string;
};

// Supports the API fields (code, subject, time) and the older ones (course_code, course_name, start_time, end_time)
type Schedule = {
  id: number;
  code?: string;
  course_code?: string;
  subject?: string;
  course_name?: string;
  instructor?: string;
  day?: string;
  time?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
};

type Row = {
  id: number;
  code: string;
  name: string;
  instructor: string;
  day: string;
  start: string;
  end: string;
  room: string;
};

// "Juan Dela Cruz" and "juan delacruz" both become "juandelacruz"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

// base64 string -> bytes (used to write the PDF without reading the printed file)
const base64ToBytes = (b64: string) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

function toRow(s: Schedule): Row {
  const full = s.time ?? [s.start_time, s.end_time].filter(Boolean).join(" - ");
  const [start = "", end = ""] = full.split(/\s+-\s+/);

  return {
    id: s.id,
    code: s.code ?? s.course_code ?? "Subject",
    name: s.subject ?? s.course_name ?? "Subject name unavailable",
    instructor: s.instructor || "TBA",
    day: s.day || "TBA",
    start,
    end,
    room: s.room || "Room TBA",
  };
}

function buildHtml(name: string, section: string, rows: Row[]) {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td><b>${esc(r.code)}</b></td>
        <td>${esc(r.name)}<br/><span class="muted">${esc(r.instructor)}</span></td>
        <td>${esc(r.day)}</td>
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
      </style>
    </head>
    <body>
      <h1>Class Schedule</h1>
      <p class="sub">Opol Community College &bull; ${esc(name)}${section ? " &bull; " + esc(section) : ""}</p>
      <table>
        <tr><th>Code</th><th>Subject / Instructor</th><th>Day</th><th>Time</th><th>Room</th></tr>
        ${body}
      </table>
    </body>
  </html>`;
}

export default function Schedules() {
  const profile = useProfile();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      const [schedRes, studRes] = await Promise.allSettled([
        api.get<Schedule[]>("/schedules"),
        api.get<Student[]>("/students"),
      ]);

      if (!active) return;

      if (schedRes.status === "fulfilled") {
        setSchedules(Array.isArray(schedRes.value.data) ? schedRes.value.data : []);
      } else {
        console.log("SCHEDULES ERROR:", schedRes.reason);
        setError(true);
      }

      if (studRes.status === "fulfilled" && Array.isArray(studRes.value.data)) {
        const list = studRes.value.data;
        setStudent(
          list.find((s) => norm(s.name) === norm(profile.name)) ??
            list.find((s) => norm(s.student_number) === norm(profile.studentId)) ??
            null
        );
      }

      setLoading(false);
    };

    loadData();
    return () => {
      active = false;
    };
  }, [profile.name, profile.studentId]);

  const rows = useMemo(
    () => schedules.map(toRow).sort((a, b) => a.code.localeCompare(b.code)),
    [schedules]
  );

  const displayName = String(student?.name || profile.name || "Student").trim();
  const section = student?.section || "";

  const download = async () => {
    setDownloading(true);
    const html = buildHtml(displayName, section, rows);

    try {
      // Ask for the PDF as base64 so we never have to read the printed file
      // (reading it triggers "Missing 'READ' permission" on some devices).
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!base64) throw new Error("No PDF data returned");

      // Write the bytes into our own cache file, which we always have access to.
      const pdf = new File(Paths.cache, "Class-Schedule.pdf");
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
      setDownloading(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading class schedule..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Schedule</Text>
      <Text style={styles.subtitle}>Time table by subject</Text>

      {error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Unable to Load Schedule</Text>
          <Text style={styles.emptyText}>Please check your connection and try again.</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No Schedule Found</Text>
          <Text style={styles.emptyText}>No class schedule is available.</Text>
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
                {[student?.student_number, section].filter(Boolean).join(" • ") || "Student"}
              </Text>
            </View>
          </View>

          {/* Time table */}
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.th, styles.colSubject]}>Subject</Text>
              <Text style={[styles.th, styles.colDay]}>Day</Text>
              <Text style={[styles.th, styles.colTime]}>Time</Text>
            </View>

            {rows.map((r, index) => (
              <View key={r.id} style={[styles.tr, index % 2 === 1 && styles.trAlt]}>
                <View style={styles.colSubject}>
                  <Text style={styles.code}>{r.code}</Text>
                  <Text style={styles.course}>{r.name}</Text>
                  <Text style={styles.meta}>{r.room} • {r.instructor}</Text>
                </View>
                <Text style={[styles.day, styles.colDay]}>{r.day.slice(0, 3).toUpperCase()}</Text>
                <View style={styles.colTime}>
                  <Text style={styles.timeText}>{r.start}</Text>
                  {!!r.end && <Text style={styles.timeEnd}>{r.end}</Text>}
                </View>
              </View>
            ))}
          </View>

          {/* Download */}
          <TouchableOpacity style={styles.download} activeOpacity={0.85} onPress={download} disabled={downloading}>
            {downloading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={20} color="#FFF" />
                <Text style={styles.downloadText}>Download Schedule (PDF)</Text>
              </>
            )}
          </TouchableOpacity>
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

  colSubject: { flex: 1, paddingRight: 8 },
  colDay: { width: 44, textAlign: "center" },
  colTime: { width: 72, alignItems: "flex-end" },

  code: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  course: { color: "#172033", fontSize: 14, fontWeight: "800", marginTop: 3 },
  meta: { color: "#94A3B8", fontSize: 11, marginTop: 4 },
  day: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  timeText: { color: "#172033", fontSize: 12, fontWeight: "700" },
  timeEnd: { color: "#64748B", fontSize: 12, marginTop: 2 },

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