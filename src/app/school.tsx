import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import api from "../services/api";
import LoadingScreen from "../components/LoadingScreen";

type School = {
  name?: string;
  school_name?: string; // old key, still supported
  short_name?: string;
  school_code?: string; // old key, still supported
  motto?: string;
  established?: string;
  president?: string;
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  office_hours?: string;
  academic_year?: string;
  semester?: string;
  mission?: string;
  vision?: string;
  core_values?: string[];
  programs?: string[];
  stats?: { students?: number; programs?: number; faculty?: number };
};

export default function School() {
  const [data, setData] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<School>("/school").then((r) => setData(r.data)).catch(console.log).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingScreen message="Loading school information..." />;

  const name = data?.name ?? data?.school_name;
  const code = data?.short_name ?? data?.school_code;
  const website = data?.website ? (data.website.startsWith("http") ? data.website : `https://${data.website}`) : undefined;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}><Text style={styles.logoText}>{code || "OCC"}</Text></View>
        <Text style={styles.title}>{name}</Text>
        {!!data?.motto && <Text style={styles.motto}>"{data.motto}"</Text>}
        {!!code && <View style={styles.pill}><Text style={styles.pillText}>{code}</Text></View>}
      </View>

      {/* Stats */}
      {data?.stats && (
        <View style={styles.stats}>
          <Stat value={data.stats.students} label="Students" />
          <Stat value={data.stats.programs} label="Programs" />
          <Stat value={data.stats.faculty} label="Faculty" />
        </View>
      )}

      {/* About */}
      <Section title="About">
        <Info label="Established" value={data?.established} />
        <Info label="Academic Year" value={data?.academic_year} />
        <Info label="Semester" value={data?.semester} />
        <Info label="Head of School" value={data?.president} />
      </Section>

      {/* Contact */}
      <Section title="Contact">
        <Info label="Address" value={data?.address} />
        <Info label="Email" value={data?.email} onPress={data?.email ? () => Linking.openURL(`mailto:${data.email}`) : undefined} />
        <Info label="Phone" value={data?.phone} onPress={data?.phone ? () => Linking.openURL(`tel:${data.phone}`) : undefined} />
        <Info label="Website" value={data?.website} onPress={website ? () => Linking.openURL(website) : undefined} />
        <Info label="Office Hours" value={data?.office_hours} />
      </Section>

      {/* Mission & Vision */}
      {!!data?.mission && (
        <Section title="Mission">
          <Text style={styles.paragraph}>{data.mission}</Text>
        </Section>
      )}
      {!!data?.vision && (
        <Section title="Vision">
          <Text style={styles.paragraph}>{data.vision}</Text>
        </Section>
      )}

      {/* Core values */}
      {!!data?.core_values?.length && (
        <Section title="Core Values">
          <View style={styles.chips}>
            {data.core_values.map((v) => (
              <View key={v} style={styles.chip}><Text style={styles.chipText}>{v}</Text></View>
            ))}
          </View>
        </Section>
      )}

      {/* Programs */}
      {!!data?.programs?.length && (
        <Section title="Programs Offered">
          {data.programs.map((p) => (
            <View key={p} style={styles.programRow}>
              <View style={styles.bullet} />
              <Text style={styles.program}>{p}</Text>
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Info({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  if (!value) return null;
  const body = (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, onPress && styles.link]}>{value}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{body}</TouchableOpacity> : body;
}

function Stat({ value, label }: { value?: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value ?? "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  content: { padding: 20, paddingBottom: 40 },

  header: { alignItems: "center", marginTop: 10, marginBottom: 22 },
  logo: { width: 90, height: 90, borderRadius: 25, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" },
  logoText: { color: "#FFF", fontSize: 25, fontWeight: "900" },
  title: { fontSize: 24, fontWeight: "900", color: "#172033", textAlign: "center", marginTop: 18 },
  motto: { color: "#64748B", fontStyle: "italic", textAlign: "center", marginTop: 6 },
  pill: { backgroundColor: "#DBEAFE", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, marginTop: 12 },
  pillText: { color: "#2563EB", fontWeight: "800", fontSize: 12 },

  stats: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: "#2563EB", borderRadius: 20, paddingVertical: 18, alignItems: "center", elevation: 3 },
  statValue: { color: "#FFF", fontSize: 28, fontWeight: "900" },
  statLabel: { color: "#DBEAFE", fontSize: 12, fontWeight: "700", marginTop: 2 },

  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 20, marginBottom: 14, elevation: 3 },
  sectionTitle: { fontSize: 17, fontWeight: "900", color: "#172033", marginBottom: 16 },

  info: { marginBottom: 16 },
  label: { fontSize: 10, color: "#94A3B8", fontWeight: "800", textTransform: "uppercase" },
  value: { color: "#334155", fontSize: 16, marginTop: 4, fontWeight: "600" },
  link: { color: "#2563EB" },

  paragraph: { color: "#334155", fontSize: 15, lineHeight: 23 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#EFF6FF", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  chipText: { color: "#2563EB", fontWeight: "800", fontSize: 13 },

  programRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  bullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB", marginTop: 7, marginRight: 12 },
  program: { flex: 1, color: "#334155", fontSize: 15, fontWeight: "600", lineHeight: 21 },
});