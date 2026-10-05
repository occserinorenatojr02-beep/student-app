import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { initials, useProfile } from "@/lib/profileStore";

type Route = "/" | "/students" | "/courses" | "/schedules" | "/grades" | "/announcements" | "/school" | "/profile";
type Grad = readonly [string, string];

const PRIMARY = "#2563EB";
const BLUE = "#2563EB";
const INK = "#0B2559";
const MUTED = "#5B7AA8";
const SOFT = "#DCEBFF";

const services: {
  href: Route;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: Grad;
}[] = [
  { href: "/schedules", title: "Class Schedule", description: "Check your timetable", icon: "calendar", colors: ["#1D4ED8", "#38BDF8"] },
  { href: "/grades", title: "Grades", description: "View academic grades", icon: "ribbon", colors: ["#2563EB", "#60A5FA"] },
  { href: "/announcements", title: "Announcements", description: "Latest school updates", icon: "megaphone", colors: ["#0EA5E9", "#7DD3FC"] },
  { href: "/school", title: "School Info", description: "About Opol Community College", icon: "school", colors: ["#1E40AF", "#3B82F6"] },
];



/* ---------------- Screen ---------------- */

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
              <LinearGradient colors={["#2563EB", "#38BDF8"]} style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(profile.name)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Link>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.hello}>Hello, {firstName}</Text>
            <Text style={styles.sub}>Keep learning, keep growing 🌟</Text>
          </View>
          <Link href="/announcements" asChild>
            <TouchableOpacity style={styles.bell}>
              <Ionicons name="notifications" size={22} color={BLUE} />
              <View style={styles.dot} />
            </TouchableOpacity>
          </Link>
        </View>

        {/* Hero card */}
        <LinearGradient
          colors={["#1E40AF", "#2563EB", "#38BDF8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.circleBig} />
          <View style={styles.circleSmall} />

          <View style={styles.badge}>
            <Ionicons name="sparkles" size={13} color={BLUE} />
            <Text style={styles.badgeText}>OCC Student Assistant</Text>
          </View>
          <Text style={styles.heroTitle}>Your student life,{"\n"}one place.</Text>
          <Text style={styles.heroDesc}>Access student info, courses, schedules, grades and school updates.</Text>
          <Link href="/students" asChild>
            <TouchableOpacity style={styles.heroBtn} activeOpacity={0.85}>
              <Text style={styles.heroBtnText}>View Students</Text>
              <Ionicons name="arrow-forward" size={18} color={BLUE} />
            </TouchableOpacity>
          </Link>
        </LinearGradient>

        {/* Continue learning */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Courses</Text>
          <Link href="/courses" asChild>
            <TouchableOpacity style={styles.seeAll}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY} />
            </TouchableOpacity>
          </Link>
        </View>
        <Link href="/courses" asChild>
          <TouchableOpacity style={styles.continueCard} activeOpacity={0.9}>
            <View style={styles.continueGlow} />
            <LinearGradient colors={["#60A5FA", BLUE]} style={styles.thumb}>
              <Text style={{ fontSize: 34 }}>🏫</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.continueTitle}>Opol Community College</Text>
              <View style={styles.progressRow}>
                <View style={styles.track}>
                  <LinearGradient
                    colors={["#2563EB", "#38BDF8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.fill, { width: "60%" }]}
                  />
                </View>
                <Text style={styles.percent}>60%</Text>
              </View>
            </View>
            <LinearGradient colors={["#2563EB", "#38BDF8"]} style={styles.play}>
              <Ionicons name="play" size={16} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Link>

        {/* Services */}
        <Text style={[styles.sectionTitle, { marginTop: 26, marginBottom: 14 }]}>Student Services</Text>
        <View style={styles.grid}>
          {services.map((s) => (
            <Link key={s.title} href={s.href} asChild>
              <TouchableOpacity
                style={StyleSheet.flatten([styles.tileWrap, { shadowColor: s.colors[0] }])}
                activeOpacity={0.88}
              >
                <LinearGradient colors={s.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
                  <View style={styles.tileCircle} />
                  <View style={styles.tileCircleSmall} />

                  <View style={styles.tileIcon}>
                    <Ionicons name={s.icon} size={22} color="#FFF" />
                  </View>
                  <View style={styles.tileArrow}>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </View>

                  <Text style={styles.tileTitle}>{s.title}</Text>
                  <Text style={styles.tileDesc}>{s.description}</Text>
                </LinearGradient>
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

function NavItem({
  icon,
  label,
  href,
  active,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: Route;
  active?: boolean;
}) {
  const inner = (
    <TouchableOpacity style={styles.navItem} activeOpacity={0.7} disabled={!href}>
      <View style={[styles.navIconWrap, active && styles.navIconActive]}>
        <Ionicons name={icon} size={22} color={active ? PRIMARY : "#93A8C9"} />
      </View>
      <Text style={[styles.navLabel, active && { color: PRIMARY, fontWeight: "700" }]}>{label}</Text>
    </TouchableOpacity>
  );
  return href ? (
    <Link href={href} asChild>
      {inner}
    </Link>
  ) : (
    inner
  );
}

const card = {
  backgroundColor: "#FFF",
  shadowColor: BLUE,
  shadowOpacity: 0.15,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#EAF3FF" },
  content: { padding: 18, paddingBottom: 130 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  hello: { fontSize: 19, fontWeight: "800", color: INK },
  sub: { fontSize: 13, color: MUTED, marginTop: 2 },
  bell: { ...card, width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", shadowOpacity: 0.1 },
  dot: { position: "absolute", top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: "#38BDF8", borderWidth: 1.5, borderColor: "#FFF" },

  hero: { borderRadius: 28, padding: 22, overflow: "hidden" },
  circleBig: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.12)", top: -50, right: -40 },
  circleSmall: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.10)", bottom: -25, right: 60 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.9)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 },
  badgeText: { fontSize: 12, fontWeight: "700", color: BLUE },
  heroTitle: { color: "#FFF", fontSize: 28, fontWeight: "800", marginTop: 14, lineHeight: 34 },
  heroDesc: { color: "rgba(255,255,255,0.95)", fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: "90%" },
  heroBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#FFF", paddingLeft: 20, paddingRight: 16, paddingVertical: 13, borderRadius: 18, marginTop: 16 },
  heroBtnText: { color: BLUE, fontWeight: "800", fontSize: 15 },

  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: INK },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: SOFT, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  seeAllText: { color: PRIMARY, fontWeight: "700", fontSize: 13 },

  continueCard: { ...card, flexDirection: "row", alignItems: "center", borderRadius: 22, padding: 12, overflow: "hidden", borderWidth: 1, borderColor: "#CFE1FF" },
  continueGlow: { position: "absolute", width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(56,189,248,0.12)", top: -50, right: -30 },
  thumb: { width: 84, height: 72, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  continueTitle: { fontSize: 15, fontWeight: "700", color: INK, lineHeight: 20 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#DBE7F8", overflow: "hidden" },
  fill: { height: 7, borderRadius: 4 },
  percent: { fontSize: 12, color: PRIMARY, fontWeight: "700" },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginLeft: 10 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tileWrap: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 24,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    backgroundColor: "#FFF",
  },
  tile: { borderRadius: 24, padding: 18, minHeight: 160, justifyContent: "flex-end", overflow: "hidden" },
  tileCircle: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.14)", top: -35, right: -35 },
  tileCircleSmall: { position: "absolute", width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.10)", bottom: -15, left: -10 },
  tileIcon: { position: "absolute", top: 16, left: 16, width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center" },
  tileArrow: { position: "absolute", top: 18, right: 16, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  tileTitle: { color: "#FFF", fontSize: 18, fontWeight: "900" },
  tileDesc: { color: "rgba(255,255,255,0.9)", fontSize: 12.5, marginTop: 4, lineHeight: 17 },

  navWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: BLUE, shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 14 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 10, paddingBottom: 6, paddingHorizontal: 8 },
  navItem: { alignItems: "center", width: 70, gap: 2 },
  navIconWrap: { width: 46, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  navIconActive: { backgroundColor: SOFT },
  navLabel: { fontSize: 11, color: "#93A8C9" },
});