import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";


/* Types */


type Grad = readonly [string, string];

// GET /courses
type Course = {
  id: number;
  code: string;
  name: string;
  units?: number;
  prerequisite?: string;
  description?: string;
  program_code?: string;
};

// GET /programs
type Program = {
  id: number;
  code: string;
  name: string;
};

// GET /schedules
type Schedule = {
  id: number;
  program_code?: string;
  schedule_type?: string;
  code?: string;
  subject?: string;
  instructor?: string;
  day?: string;
  time?: string;
  room?: string;
};

// Subject Cards
type Subject = {
  id: number;
  code: string;
  title: string;
  units: number;
  program: string;
  prerequisite: string;
  description: string;
  instructor: string;
  room: string;
  schedules: string[];
  icon: keyof typeof Ionicons.glyphMap;
  colors: Grad;
};


/* Helpers */

const PRIMARY = "#2563EB";
const INK = "#0B2559";
const MUTED = "#5B7AA8";
const SOFT = "#DCEBFF";

// Look of each course (program)
const PROGRAM_STYLE: Record<string, { icon: keyof typeof Ionicons.glyphMap; colors: Grad }> = {
  BSIT: { icon: "laptop", colors: ["#1D4ED8", "#38BDF8"] },
  BSBA: { icon: "briefcase", colors: ["#0EA5E9", "#7DD3FC"] },
  BEED: { icon: "school", colors: ["#1E40AF", "#3B82F6"] },
};
const DEFAULT_STYLE = { icon: "book" as keyof typeof Ionicons.glyphMap, colors: ["#2563EB", "#60A5FA"] as Grad };

// "IT 201" and "IT201" both become "it201"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Accepts either a plain array or a data (wrapper)
const toArray = <T,>(value: any): T[] =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : [];


/* Screen */

export default function Subjects() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [query, setQuery] = useState("");
  const [program, setProgram] = useState("All");
  const [openId, setOpenId] = useState<number | null>(null);

  // Ignore responses from a closed screen or an older request
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
      const [coursesRes, programsRes, schedulesRes] = await Promise.allSettled([
        api.get("/courses"),
        api.get("/programs"),
        api.get("/schedules"),
      ]);

      // The subject list is required
      if (coursesRes.status === "rejected") throw coursesRes.reason;
      if (isStale()) return;

      setCourses(toArray<Course>(coursesRes.value.data));

      // Programs and schedules are extras: a failure is not fatal
      setPrograms(programsRes.status === "fulfilled" ? toArray<Program>(programsRes.value.data) : []);
      setSchedules(schedulesRes.status === "fulfilled" ? toArray<Schedule>(schedulesRes.value.data) : []);

      setError(false);
    } catch (e) {
      // Keep the old list on a failed refresh, only flag the error
      console.log("SUBJECTS ERROR:", e);
      if (!isStale()) setError(true);
    } finally {
      if (!isStale()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // subject code -> its timetable lines, instructor and room (taken from /schedules)
  const scheduleByCode = useMemo(() => {
    const map = new Map<string, { instructor: string; room: string; lines: string[] }>();

    schedules.forEach((s) => {
      const key = norm(s.code);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, { instructor: s.instructor || "", room: s.room || "", lines: [] });
      }

      const line = `Schedule ${s.schedule_type || "A"}: ${[s.day, s.time].filter(Boolean).join(", ")}`;
      const entry = map.get(key)!;
      if (!entry.lines.includes(line)) entry.lines.push(line);
    });

    map.forEach((v) => v.lines.sort());
    return map;
  }, [schedules]);

  const subjects = useMemo<Subject[]>(() => {
    return courses.map((c) => {
      const prog = (c.program_code || "").toUpperCase();
      const style = PROGRAM_STYLE[prog] ?? DEFAULT_STYLE;
      const sched = scheduleByCode.get(norm(c.code));
      const prereq = (c.prerequisite || "").trim();

      return {
        id: c.id,
        code: c.code,
        title: c.name,
        units: typeof c.units === "number" ? c.units : 0,
        program: prog,
        prerequisite: prereq && prereq.toLowerCase() !== "none" ? prereq : "",
        description: c.description || "",
        instructor: sched?.instructor || "",
        room: sched?.room || "",
        schedules: sched?.lines ?? [],
        icon: style.icon,
        colors: style.colors,
      };
    });
  }, [courses, scheduleByCode]);

  // Filter chips come from /programs (falls back to the codes found in the subjects)
  const programChips = useMemo(() => {
    const codes = programs.length
      ? programs.map((p) => p.code.toUpperCase())
      : Array.from(new Set(subjects.map((s) => s.program).filter(Boolean)));
    return ["All", ...codes];
  }, [programs, subjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects.filter(
      (s) =>
        (program === "All" || s.program === program) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.instructor.toLowerCase().includes(q))
    );
  }, [subjects, query, program]);

  const totalUnits = filtered.reduce((sum, s) => sum + s.units, 0);

  if (loading) return <LoadingScreen message="Loading subjects..." />;

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
      >
        {/* Summary */}
        <LinearGradient
          colors={["#1E40AF", "#2563EB", "#38BDF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.circleBig} />
          <View style={styles.circleSmall} />
          <Text style={styles.heroLabel}>Subjects</Text>
          <View style={styles.heroStats}>
            <View>
              <Text style={styles.heroNumber}>{filtered.length}</Text>
              <Text style={styles.heroSub}>Subjects</Text>
            </View>
            <View style={styles.heroDivider} />
            <View>
              <Text style={styles.heroNumber}>{totalUnits}</Text>
              <Text style={styles.heroSub}>Total units</Text>
            </View>
          </View>
        </LinearGradient>

        {error && subjects.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={36} color="#93A8C9" />
            <Text style={styles.emptyTitle}>Unable to load subjects</Text>
            <Text style={styles.emptyDesc}>Check your connection, then pull down to retry.</Text>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={MUTED} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search subject, code or instructor"
                placeholderTextColor="#93A8C9"
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#93A8C9" />
                </TouchableOpacity>
              )}
            </View>

            {/* Course filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {programChips.map((p) => {
                const active = p === program;
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.8}
                    onPress={() => setProgram(p)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* List */}
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="book-outline" size={36} color="#93A8C9" />
                <Text style={styles.emptyTitle}>No subjects found</Text>
                <Text style={styles.emptyDesc}>Try a different search or course.</Text>
              </View>
            ) : (
              filtered.map((s) => {
                const open = openId === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.9}
                    onPress={() => setOpenId(open ? null : s.id)}
                    style={styles.card}
                  >
                    <View style={styles.cardTop}>
                      <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.icon}>
                        <Ionicons name={s.icon} size={22} color="#FFF" />
                      </LinearGradient>
                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={styles.code}>{s.code}{s.program ? `  •  ${s.program}` : ""}</Text>
                        <Text style={styles.title}>{s.title}</Text>
                      </View>
                      <View style={styles.units}>
                        <Text style={styles.unitsNum}>{s.units}</Text>
                        <Text style={styles.unitsLabel}>{s.units === 1 ? "unit" : "units"}</Text>
                      </View>
                    </View>

                    {open && (
                      <View style={styles.details}>
                        {!!s.description && <Text style={styles.description}>{s.description}</Text>}
                        {!!s.prerequisite && <Detail icon="git-branch-outline" text={`Prerequisite: ${s.prerequisite}`} />}
                        {!!s.instructor && <Detail icon="person-outline" text={s.instructor} />}
                        {s.schedules.map((line) => (
                          <Detail key={line} icon="time-outline" text={line} />
                        ))}
                        {!!s.room && <Detail icon="location-outline" text={s.room} />}
                        {!s.instructor && s.schedules.length === 0 && (
                          <Detail icon="time-outline" text="No schedule yet" />
                        )}
                      </View>
                    )}

                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#93A8C9"
                      style={styles.chevron}
                    />
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={15} color={PRIMARY} />
      </View>
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

const card = {
  backgroundColor: "#FFF",
  shadowColor: PRIMARY,
  shadowOpacity: 0.15,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EAF3FF" },
  content: { padding: 18, paddingBottom: 130 },

  hero: { borderRadius: 28, padding: 22, overflow: "hidden" },
  circleBig: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.12)", top: -50, right: -40 },
  circleSmall: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.10)", bottom: -25, right: 70 },
  heroLabel: { color: "rgba(255,255,255,0.95)", fontSize: 14, fontWeight: "700" },
  heroStats: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  heroNumber: { color: "#FFF", fontSize: 32, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: 12.5, marginTop: 2 },
  heroDivider: { width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.35)", marginHorizontal: 28 },

  search: { ...card, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 18, paddingHorizontal: 14, height: 48, marginTop: 18, shadowOpacity: 0.08, borderWidth: 1, borderColor: "#CFE1FF" },
  searchInput: { flex: 1, fontSize: 14, color: INK, paddingVertical: 0 },

  chips: { flexDirection: "row", gap: 10, marginTop: 14, marginBottom: 6 },
  chip: { backgroundColor: SOFT, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  chipActive: { backgroundColor: PRIMARY },
  chipText: { color: PRIMARY, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#FFF" },

  card: { ...card, borderRadius: 22, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#CFE1FF" },
  cardTop: { flexDirection: "row", alignItems: "center" },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  code: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  title: { fontSize: 15, fontWeight: "800", color: INK, marginTop: 2, lineHeight: 20 },
  units: { alignItems: "center", backgroundColor: SOFT, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  unitsNum: { fontSize: 16, fontWeight: "800", color: PRIMARY },
  unitsLabel: { fontSize: 10, color: MUTED },

  details: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E3EEFF", gap: 10 },
  description: { fontSize: 13, lineHeight: 19, color: "#475569" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  detailText: { fontSize: 13, color: INK, flex: 1 },
  chevron: { alignSelf: "center", marginTop: 8 },

  empty: { alignItems: "center", paddingVertical: 50, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: MUTED, textAlign: "center" },
});