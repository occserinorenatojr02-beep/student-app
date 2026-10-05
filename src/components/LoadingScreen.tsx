import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const PRIMARY = "#6D5DF6";
const INK = "#1E1B3A";
const MUTED = "#6B7280";

export default function LoadingScreen({
  message = "Loading...",
}: {
  message?: string;
}) {
  const enter = useRef(new Animated.Value(0)).current; // fade + scale in
  const float = useRef(new Animated.Value(0)).current; // logo floating
  const ring1 = useRef(new Animated.Value(0)).current; // pulse rings
  const ring2 = useRef(new Animated.Value(0)).current;
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const running: Animated.CompositeAnimation[] = [];
    const run = (a: Animated.CompositeAnimation) => {
      running.push(a);
      a.start();
    };

    // Entrance
    run(
      Animated.timing(enter, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    // Logo float (up and down)
    run(
      Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(float, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      )
    );

    // Pulse rings (second one starts a bit later)
    const pulse = (v: Animated.Value) =>
      Animated.loop(Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    run(pulse(ring1));
    run(Animated.sequence([Animated.delay(1100), pulse(ring2)]));

    // Bouncing dots
    dots.forEach((d, i) => {
      run(
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 160),
            Animated.timing(d, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(d, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.delay((2 - i) * 160),
          ])
        )
      );
    });

    return () => running.forEach((a) => a.stop());
  }, [enter, float, ring1, ring2, dots]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  });

  return (
    <LinearGradient
      colors={["#F1F4FF", "#E9E6FF", "#DDF3FB"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      {/* soft decorative circles */}
      <View style={styles.bubbleTop} />
      <View style={styles.bubbleBottom} />

      <Animated.View
        style={{
          alignItems: "center",
          opacity: enter,
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
        }}
      >
        {/* Logo with pulse rings */}
        <View style={styles.logoArea}>
          <Animated.View style={[styles.ring, ringStyle(ring1)]} />
          <Animated.View style={[styles.ring, ringStyle(ring2)]} />
          <Animated.View
            style={[
              styles.logoShadow,
              { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [4, -6] }) }] },
            ]}
          >
            <LinearGradient
              colors={["#6D5DF6", "#3B82F6", "#06B6D4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Text style={styles.logoText}>OCC</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        <Text style={styles.title}>Student Portal</Text>
        <Text style={styles.subtitle}>Opol Community College</Text>

        {/* Message pill with bouncing dots */}
        <View style={styles.pill}>
          <View style={styles.dotsRow}>
            {dots.map((d, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                    transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.message}>{message}</Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },

  bubbleTop: { position: "absolute", width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(109,93,246,0.10)", top: -80, right: -90 },
  bubbleBottom: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(6,182,212,0.12)", bottom: -70, left: -70 },

  logoArea: { width: 96, height: 96, alignItems: "center", justifyContent: "center", marginBottom: 34 },
  ring: { position: "absolute", width: 96, height: 96, borderRadius: 30, backgroundColor: PRIMARY },
  logoShadow: {
    borderRadius: 28,
    backgroundColor: "#FFF",
    shadowColor: PRIMARY,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  logo: { width: 96, height: 96, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#FFF", fontSize: 28, fontWeight: "900", letterSpacing: 1 },

  title: { fontSize: 28, fontWeight: "900", color: INK },
  subtitle: { color: MUTED, marginTop: 5, fontSize: 14 },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 34,
    backgroundColor: "#FFF",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 5, height: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  message: { color: INK, fontSize: 14, fontWeight: "600" },
});