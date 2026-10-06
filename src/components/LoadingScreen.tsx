import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BLUE = "#2563EB";

export default function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  const spin = useRef(new Animated.Value(0)).current; // rotating ring
  const pulse = useRef(new Animated.Value(0)).current; // expanding glow + icon beat
  const fade = useRef(new Animated.Value(0)).current; // fade-in when the screen appears
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current; // bouncing dots

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Each dot jumps a little later than the one before it
    const dotLoops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );

    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    spinLoop.start();
    pulseLoop.start();
    dotLoops.forEach((l) => l.start());

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      dotLoops.forEach((l) => l.stop());
    };
  }, [spin, pulse, fade, dots]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });
  const iconScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });
  const slideUp = fade.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  // The dots are animated, so drop any "..." already written in the message
  const text = message.replace(/\.+$/, "");

  return (
    <View style={s.container}>
      <Animated.View style={[s.content, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        <View style={s.loader}>
          <Animated.View style={[s.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
          <Animated.View style={[s.ring, { transform: [{ rotate }] }]} />
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Ionicons name="school" size={30} color={BLUE} />
          </Animated.View>
        </View>

        <View style={s.row}>
          <Text style={s.text}>{text}</Text>
          <View style={s.dots}>
            {dots.map((d, i) => (
              <Animated.View
                key={i}
                style={[
                  s.dot,
                  {
                    opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                    transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7FB" },
  content: { alignItems: "center" },

  loader: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: BLUE },
  ring: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: "#DBEAFE",
    borderTopColor: BLUE,
    borderRightColor: "#93C5FD",
  },

  row: { flexDirection: "row", alignItems: "flex-end", marginTop: 18 },
  text: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  dots: { flexDirection: "row", alignItems: "flex-end", marginLeft: 4, paddingBottom: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: BLUE, marginLeft: 3 },
});