import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type Grad = readonly [string, string];
type Semester = "All" | "1st Sem" | "2nd Sem";

type Subject = {
  id: string;
  code: string;
  title: string;
  units: number;
  instructor: string;
  schedule: string;
  room: string;
  semester: Exclude<Semester, "All">;
  icon: keyof typeof Ionicons.glyphMap;
  colors: Grad;
};

const PRIMARY = "#2563EB";
const INK = "#0B2559";
const MUTED = "#5B7AA8";
const SOFT = "#DCEBFF";

// Replace with your own data / API call
const SUBJECTS: Subject[] = [
  { id: "1", code: "IT 101", title: "Introduction to Computing", units: 3, instructor: "Prof. Santos", schedule: "Mon & Wed, 8:00 - 9:30 AM", room: "Room 201", semester: "1st Sem", icon: "laptop", colors: ["#1D4ED8", "#38BDF8"] },
  { id: "2", code: "IT 102", title: "Computer Programming 1", units: 3, instructor: "Prof. Reyes", schedule: "Tue & Thu, 10:00 - 11:30 AM", room: "Computer Lab 1", semester: "1st Sem", icon: "code-slash", colors: ["#2563EB", "#60A5FA"] },
  { id: "3", code: "GE 101", title: "Understanding the Self", units: 3, instructor: "Prof. Cruz", schedule: "Fri, 1:00 - 4:00 PM", room: "Room 105", semester: "1st Sem", icon: "person", colors: ["#0EA5E9", "#7DD3FC"] },
  { id: "4", code: "MATH 101", title: "Mathematics in the Modern World", units: 3, instructor: "Prof. Garcia", schedule: "Mon & Wed, 1:00 - 2:30 PM", room: "Room 203", semester: "1st Sem", icon: "calculator", colors: ["#1E40AF", "#3B82F6"] },
  { id: "5", code: "IT 103", title: "Computer Programming 2", units: 3, instructor: "Prof. Reyes", schedule: "Tue & Thu, 8:00 - 9:30 AM", room: "Computer Lab 2", semester: "2nd Sem", icon: "terminal", colors: ["#2563EB", "#38BDF8"] },
  { id: "6", code: "IT 104", title: "Discrete Mathematics", units: 3, instructor: "Prof. Garcia", schedule: "Mon & Wed, 10:00 - 11:30 AM", room: "Room 204", semester: "2nd Sem", icon: "git-network", colors: ["#1D4ED8", "#60A5FA"] },
  { id: "7", code: "GE 102", title: "Purposive Communication", units: 3, instructor: "Prof. Lim", schedule: "Fri, 8:00 - 11:00 AM", room: "Room 110", semester: "2nd Sem", icon: "chatbubbles", colors: ["#0EA5E9", "#38BDF8"] },
  { id: "8", code: "PE 102", title: "Physical Education 2", units: 2, instructor: "Coach Ramos", schedule: "Sat, 8:00 - 10:00 AM", room: "Gymnasium", semester: "2nd Sem", icon: "fitness", colors: ["#1E40AF", "#3B82F6"] },
];

const SEMESTERS: Semester[] = ["All", "1st Sem", "2nd Sem"];

export default function Subjects() {
  const [query, setQuery] = useState("");
  const [semester, setSemester] = useState<Semester>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUBJECTS.filter(
      (s) =>
        (semester === "All" || s.semester === semester) &&
        (!q ||
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.instructor.toLowerCase().includes(q))
    );
  }, [query, semester]);

  const totalUnits = filtered.reduce((sum, s) => sum + s.units, 0);

  return (
    <View style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.heroLabel}>My Subjects</Text>
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

        {/* Semester filter */}
        <View style={styles.chips}>
          {SEMESTERS.map((s) => {
            const active = s === semester;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.8}
                onPress={() => setSemester(s)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List */}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={36} color="#93A8C9" />
            <Text style={styles.emptyTitle}>No subjects found</Text>
            <Text style={styles.emptyDesc}>Try a different search or semester.</Text>
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
                    <Text style={styles.code}>{s.code}</Text>
                    <Text style={styles.title}>{s.title}</Text>
                  </View>
                  <View style={styles.units}>
                    <Text style={styles.unitsNum}>{s.units}</Text>
                    <Text style={styles.unitsLabel}>units</Text>
                  </View>
                </View>

                {open && (
                  <View style={styles.details}>
                    <Detail icon="person-outline" text={s.instructor} />
                    <Detail icon="time-outline" text={s.schedule} />
                    <Detail icon="location-outline" text={s.room} />
                    <Detail icon="calendar-outline" text={s.semester} />
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
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: SOFT, alignItems: "center", justifyContent: "center" },
  detailText: { fontSize: 13, color: INK, flex: 1 },
  chevron: { alignSelf: "center", marginTop: 8 },

  empty: { alignItems: "center", paddingVertical: 50, gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: INK, marginTop: 6 },
  emptyDesc: { fontSize: 13, color: MUTED },
});