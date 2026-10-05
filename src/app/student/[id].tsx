import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../../services/api";

type Student = {
  id: number; student_number: string; name: string; course: string; year_level: number;
  section: string; email: string; phone: string; status: string; gender: string;
  birth_date: string; address: string; guardian: string; guardian_phone: string;
};

export default function StudentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const response = await api.get<Student[]>("/students");
        const selected = response.data.find((item) => item.id === Number(id));
        setStudent(selected ?? null);
      } catch (error) {
        console.log("STUDENT PROFILE ERROR:", error);
        setStudent(null);
      } finally {
        setLoading(false);
      }
    };
    loadStudent();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loading}>Loading student information...</Text></View>;

  if (!student) return <View style={styles.center}><Text style={styles.emoji}>👨‍🎓</Text><Text style={styles.notFound}>Student Not Found</Text><Text style={styles.muted}>The student information could not be found.</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{student.name.charAt(0)}</Text></View>
        <Text style={styles.name}>{student.name}</Text>
        <Text style={styles.number}>{student.student_number}</Text>
        <View style={styles.status}><Text style={styles.statusText}>{student.status}</Text></View>
      </View>

      <Section title="Basic Information">
        <Info label="Student Number" value={student.student_number} />
        <Info label="Full Name" value={student.name} />
        <Info label="Gender" value={student.gender} />
        <Info label="Birth Date" value={student.birth_date} />
      </Section>

      <Section title="Academic Information">
        <Info label="Course" value={student.course} />
        <Info label="Year Level" value={String(student.year_level)} />
        <Info label="Section" value={student.section} />
        <Info label="Status" value={student.status} />
      </Section>

      <Section title="Contact Information">
        <Info label="Email" value={student.email} />
        <Info label="Phone" value={student.phone} />
        <Info label="Address" value={student.address} />
      </Section>

      <Section title="Guardian Information">
        <Info label="Guardian" value={student.guardian} />
        <Info label="Guardian Phone" value={student.guardian_phone} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <><Text style={styles.sectionTitle}>{title}</Text><View style={styles.card}>{children}</View></>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FB" },
  content: { padding: 18, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F7FB", padding: 25 },
  loading: { marginTop: 12, color: "#64748B" },
  emoji: { fontSize: 55 },
  notFound: { fontSize: 22, fontWeight: "900", color: "#172033", marginTop: 15 },
  muted: { color: "#64748B", marginTop: 8, textAlign: "center" },
  header: { backgroundColor: "#2563EB", borderRadius: 22, padding: 25, alignItems: "center", marginBottom: 25 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", marginBottom: 15 },
  avatarText: { color: "#2563EB", fontSize: 36, fontWeight: "900" },
  name: { color: "#FFF", fontSize: 24, fontWeight: "900", textAlign: "center" },
  number: { color: "#DBEAFE", marginTop: 5 },
  status: { backgroundColor: "#DCFCE7", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  statusText: { color: "#15803D", fontWeight: "800" },
  sectionTitle: { fontSize: 19, fontWeight: "900", color: "#172033", marginBottom: 10, marginTop: 5 },
  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 17, marginBottom: 20, elevation: 2 },
  row: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7", paddingVertical: 12 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 4 },
  value: { color: "#172033", fontSize: 15, fontWeight: "600" },
});
