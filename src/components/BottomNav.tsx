import { useEffect, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const PRIMARY = "#2563EB";
const SOFT = "#DCEBFF";
const PILL_W = 46;

const tabs = [
  { href: "/", label: "Home", icon: "home", iconOff: "home-outline" },
  { href: "/students", label: "Students", icon: "people", iconOff: "people-outline" },
  { href: "/subject", label: "Schedule", icon: "library", iconOff: "library-outline" },
  { href: "/profile", label: "Profile", icon: "person", iconOff: "person-outline" },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [width, setWidth] = useState(0);

  const activeIndex = tabs.findIndex((t) =>
    t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)
  );

  const anim = useRef(new Animated.Value(Math.max(activeIndex, 0))).current;

  useEffect(() => {
    if (activeIndex < 0) return;
    Animated.spring(anim, {
      toValue: activeIndex,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  }, [activeIndex, anim]);

  // hide the nav on screens that aren't one of the tabs (grades, schedules, etc.)
  if (activeIndex < 0) return null;

  const tabW = width / tabs.length;
  const offset = (tabW - PILL_W) / 2;
  const translateX = anim.interpolate({
    inputRange: [0, tabs.length - 1],
    outputRange: [offset, offset + tabW * (tabs.length - 1)],
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <SafeAreaView edges={["bottom"]} style={styles.navWrap}>
      <View style={styles.nav} onLayout={onLayout}>
        {width > 0 && (
          <Animated.View style={[styles.pill, { transform: [{ translateX }] }]} />
        )}
        {tabs.map((t, i) => {
          const active = i === activeIndex;
          return (
            <TouchableOpacity
              key={t.href}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => !active && router.navigate(t.href)}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={active ? t.icon : t.iconOff}
                  size={22}
                  color={active ? PRIMARY : "#93A8C9"}
                />
              </View>
              <Text style={[styles.label, active && { color: PRIMARY, fontWeight: "700" }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navWrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    shadowColor: PRIMARY, shadowOpacity: 0.15, shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }, elevation: 14,
  },
  nav: { flexDirection: "row", paddingTop: 10, paddingBottom: 6 },
  pill: {
    position: "absolute", top: 10, left: 0,
    width: PILL_W, height: 30, borderRadius: 15,
    backgroundColor: SOFT,
  },
  navItem: { flex: 1, alignItems: "center", gap: 2 },
  iconWrap: { width: PILL_W, height: 30, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, color: "#93A8C9" },
});