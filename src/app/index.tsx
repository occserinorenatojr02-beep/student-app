import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { initials, useProfile } from "@/lib/profileStore";

type Route = "/" | "/students" | "/courses" | "/schedules" | "/grades" | "/announcements" | "/school" | "/profile";

const PRIMARY = "#6D5DF6";
const BLUE = "#2563EB";
const INK = "#1E1B3A";
const MUTED = "#6B7280";

const services: { href: Route; title: string; description: string }[] = [
  { href: "/schedules", title: "Class Schedule", description: "Check your timetable" },
  { href: "/grades", title: "Grades", description: "View academic grades" },
  { href: "/announcements", title: "Announcements", description: "Latest school updates" },
  { href: "/school", title: "School Info", description: "About Opol Community College" },
];

export default function Home() {
  const profile = useProfile();
  const firstName = profile.name.split(" ")[0] || "Student";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Link href="/profile" asChild>
            <TouchableOpacity activeOpacity={0.8}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(profile.name)}</Text></View>
            </TouchableOpacity>
          </Link>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.hello}>Hello, {firstName}</Text>
            <Text style={styles.sub}>Keep learning, keep growing 🌟</Text>
          </View>
          <Link href="/announcements" asChild>
            <TouchableOpacity style={styles.bell}>
              <Ionicons name="notifications-outline" size={24} color={INK} />
              <View style={styles.dot} />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Hero card */}
        <LinearGradient colors={["#3B82F6", "#2563EB", "#1D4ED8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={13} color={BLUE} />
            <Text style={styles.badgeText}>OCC Student Assistant</Text>
          </View>
          <Text style={styles.heroTitle}>Your student life,{"\n"}one place.</Text>
          <Text style={styles.heroDesc}>Access student info, courses, schedules, grades and school updates.</Text>
          <Link href="/students" asChild>
            <TouchableOpacity style={styles.heroBtn} activeOpacity={0.85}>
              <Text style={styles.heroBtnText}>View Students</Text>
              <Ionicons name="chevron-forward" size={18} color={BLUE} />
            </TouchableOpacity>
          </Link>
        </LinearGradient>

        {/* Continue learning */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <Link href="/courses" asChild>
            <TouchableOpacity style={styles.seeAll}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </Link>
        </View>
        <Link href="/courses" asChild>
          <TouchableOpacity style={styles.continueCard} activeOpacity={0.9}>
            <LinearGradient colors={["#60A5FA", BLUE]} style={styles.thumb}>
              <Text style={{ fontSize: 34 }}>🏫</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.continueTitle}>Opol Community College</Text>
              <View style={styles.progressRow}>
                <View style={styles.track}><View style={[styles.fill, { width: "60%" }]} /></View>
                <Text style={styles.percent}>60%</Text>
              </View>
            </View>
            <View style={styles.play}><Ionicons name="play" size={16} color={PRIMARY} /></View>
          </TouchableOpacity>
        </Link>

        {/* Services */}
        <Text style={[styles.sectionTitle, { marginTop: 26, marginBottom: 14 }]}>Student Services</Text>
        <View style={styles.grid}>
          {services.map((s) => (
            <Link key={s.title} href={s.href} asChild>
              <TouchableOpacity style={styles.tile} activeOpacity={0.85}>
                <Text style={styles.tileTitle}>{s.title}</Text>
                <Text style={styles.tileDesc}>{s.description}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>

      {/* Bottom navigation */}
      <SafeAreaView edges={["bottom"]} style={styles.navWrap}>
        <View style={styles.nav}>
          <NavItem icon="home" label="Home" active />
          <NavItem icon="people-outline" label="Students" href="/students" />
          <NavItem icon="book-outline" label="Courses" href="/courses" />
          <NavItem icon="person-outline" label="Profile" href="/profile" />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function NavItem({ icon, label, href, active }: { icon: keyof typeof Ionicons.glyphMap; label: string; href?: Route; active?: boolean }) {
  const inner = (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.7} disabled={!href}>
      <Ionicons name={icon} size={24} color={active ? PRIMARY : "#9CA3AF"} />
      <Text style={[styles.navLabel, active && { color: PRIMARY, fontWeight: "700" }]}>{label}</Text>
    </TouchableOpacity>
  );
  return href ? <Link href={href} asChild>{inner}</Link> : inner;
}

const card = {
  backgroundColor: "#FFF",
  shadowColor: "#6D5DF6",
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

const blueTile = {
  backgroundColor: BLUE,
  borderRadius: 24,
  padding: 18,
  minHeight: 130,
  justifyContent: "flex-end",
  overflow: "hidden",
  shadowColor: BLUE,
  shadowOpacity: 0.25,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FD" },
  content: { padding: 18, paddingBottom: 130 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  hello: { fontSize: 19, fontWeight: "800", color: INK },
  sub: { fontSize: 13, color: MUTED, marginTop: 2 },
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, right: 11, width: 9, height: 9, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#F8F9FD" },

  hero: { borderRadius: 26, padding: 22, overflow: "hidden" },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.75)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  badgeText: { fontSize: 12, fontWeight: "700", color: BLUE },
  heroTitle: { color: "#FFF", fontSize: 28, fontWeight: "800", marginTop: 14, lineHeight: 34 },
  heroDesc: { color: "rgba(255,255,255,0.92)", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: "90%" },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "#FFF", paddingLeft: 20, paddingRight: 14, paddingVertical: 13, borderRadius: 18, marginTop: 16 },
  heroBtnText: { color: BLUE, fontWeight: "800", fontSize: 15 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: INK },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { color: PRIMARY, fontWeight: "700", fontSize: 14 },

  continueCard: { ...card, flexDirection: "row", alignItems: "center", borderRadius: 20, padding: 12 },
  thumb: { width: 84, height: 72, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  continueTitle: { fontSize: 15, fontWeight: "700", color: INK, lineHeight: 20 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#E5E7EB" },
  fill: { height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  percent: { fontSize: 12, color: MUTED },
  play: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#EEF0FF", alignItems: "center", justifyContent: "center", marginLeft: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { ...blueTile, width: "48%", flexGrow: 1, minHeight: 140 },
  tileTitle: { color: "#FFF", fontSize: 19, fontWeight: "900" },
  tileDesc: { color: "#DBEAFE", fontSize: 12.5, marginTop: 4, lineHeight: 17 },

  navWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 12, paddingBottom: 6, paddingHorizontal: 8 },
  navItem: { alignItems: "center", width: 64, gap: 3 },
  navLabel: { fontSize: 11, color: "#9CA3AF" },
});