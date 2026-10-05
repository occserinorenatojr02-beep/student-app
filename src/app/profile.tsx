import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../services/api";
import { Profile, initials, setProfile, useProfile } from "./../lib/profileStore";

const BLUE = "#2563EB";
const INK = "#1E1B3A";
const MUTED = "#6B7280";

// Matches the shape returned by GET /students
type Student = {
  id: number;
  student_number: string;
  name: string;
  course: string;
  year_level: number;
  section: string;
  email: string;
  phone: string;
  status: string;
  gender: string;
  birth_date: string;
  address: string;
  guardian: string;
  guardian_phone: string;
};

const fields: { key: keyof Profile; label: string; keyboard?: "email-address" }[] = [
  { key: "name", label: "Full name" },
  { key: "studentId", label: "Student ID" },
  { key: "program", label: "Program" },
  { key: "year", label: "Year level" },
  { key: "email", label: "Email", keyboard: "email-address" },
];

// "Juan Dela Cruz" and "juan delacruz" both become "juandelacruz"
const norm = (s?: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ordinal = (n: number) => {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffix[(v - 20) % 10] || suffix[v] || suffix[0]} Year`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load the student from the backend and copy it into the profile store
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get<Student[]>("/students");
        if (!active) return;

        const list = Array.isArray(res.data) ? res.data : [];
        const found =
          list.find((s) => norm(s.student_number) === norm(profile.studentId)) ??
          list.find((s) => norm(s.name) === norm(profile.name)) ??
          null;

        if (found) {
          setStudent(found);
          const synced: Profile = {
            ...profile,
            name: found.name,
            studentId: found.student_number,
            program: found.course,
            year: ordinal(found.year_level),
            email: found.email,
          };
          setProfile(synced);
          setDraft(synced);
        }
      } catch (e) {
        console.log("PROFILE ERROR:", e);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
    // Run once when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(profile);
    setEditing(false);
  };

  const save = async () => {
    const name = draft.name.trim() || profile.name;

    // No matching student on the server: keep the change on the device only
    if (!student) {
      setProfile({ ...draft, name });
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<Student>(`/students/${student.id}`, {
        name,
        email: draft.email.trim(),
        course: draft.program.trim(),
        year_level: parseInt(draft.year, 10) || student.year_level,
      });

      const updated = res.data;
      setStudent(updated);
      setProfile({
        ...profile,
        name: updated.name,
        studentId: updated.student_number,
        program: updated.course,
        year: ordinal(updated.year_level),
        email: updated.email,
      });
      setEditing(false);
    } catch (e: any) {
      console.log("PROFILE SAVE ERROR:", e?.response?.data ?? e);
      const firstError = e?.response?.data?.errors
        ? (Object.values(e.response.data.errors)[0] as string[])[0]
        : null;
      Alert.alert("Save failed", firstError || "Unable to save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const shown = editing ? draft : profile;

  // Extra details that only exist on the backend (read-only)
  const details: { label: string; value?: string }[] = student
    ? [
        { label: "Section", value: student.section },
        { label: "Status", value: student.status },
        { label: "Gender", value: student.gender },
        { label: "Birth date", value: student.birth_date },
        { label: "Phone", value: student.phone },
        { label: "Address", value: student.address },
        { label: "Guardian", value: student.guardian },
        { label: "Guardian phone", value: student.guardian_phone },
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
          <Text style={styles.title}>{editing ? "Edit Profile" : "My Profile"}</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={BLUE} />
            <Text style={styles.centerText}>Loading profile...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Notice when the backend data could not be used */}
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Unable to reach the server. Showing saved profile.</Text>
              </View>
            ) : !student ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>No matching student found in the records.</Text>
              </View>
            ) : null}

            {/* Identity card */}
            <View style={styles.identity}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(shown.name)}</Text></View>
              <Text style={styles.name}>{shown.name || "Your name"}</Text>
              <Text style={styles.program}>{shown.program || "Program"}</Text>
            </View>

            {/* Main details */}
            <View style={styles.card}>
              {fields.map((f, i) => (
                <View key={f.key} style={[styles.field, i < fields.length - 1 && !editing && styles.divider]}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {editing && f.key !== "studentId" ? (
                    <TextInput
                      style={styles.input}
                      value={draft[f.key]}
                      onChangeText={(t) => setDraft({ ...draft, [f.key]: t })}
                      keyboardType={f.keyboard}
                      autoCapitalize={f.keyboard ? "none" : "words"}
                      placeholder={f.label}
                      placeholderTextColor="#9CA3AF"
                    />
                  ) : (
                    <Text style={styles.fieldValue}>{profile[f.key] || "—"}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Backend-only details */}
            {!editing && details.length > 0 && (
              <View style={[styles.card, { marginTop: 14 }]}>
                {details.map((d, i) => (
                  <View key={d.label} style={[styles.field, i < details.length - 1 && styles.divider]}>
                    <Text style={styles.fieldLabel}>{d.label}</Text>
                    <Text style={styles.fieldValue}>{d.value || "—"}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            {editing ? (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={cancel} activeOpacity={0.85} disabled={saving}>
                  <Text style={[styles.btnText, { color: BLUE }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnSolid]} onPress={save} activeOpacity={0.85} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Save changes</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btn, styles.btnSolid, { marginTop: 16 }]} onPress={startEdit} activeOpacity={0.85}>
                <Text style={styles.btnText}>Edit profile</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FD" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  title: { fontSize: 19, fontWeight: "800", color: INK },
  content: { padding: 18, paddingBottom: 40 },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { color: MUTED, marginTop: 10 },

  notice: { backgroundColor: "#FEF3C7", borderRadius: 14, padding: 12, marginBottom: 14 },
  noticeText: { color: "#92400E", fontSize: 13, fontWeight: "600" },

  identity: { backgroundColor: BLUE, borderRadius: 26, alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, marginBottom: 18 },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  avatarText: { color: BLUE, fontSize: 32, fontWeight: "900" },
  name: { color: "#FFF", fontSize: 22, fontWeight: "900", marginTop: 14, textAlign: "center" },
  program: { color: "#DBEAFE", fontSize: 14, marginTop: 4, textAlign: "center" },

  card: { backgroundColor: "#FFF", borderRadius: 22, paddingHorizontal: 18, paddingVertical: 6, elevation: 2, shadowColor: "#2563EB", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  field: { paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: MUTED, marginBottom: 6 },
  fieldValue: { fontSize: 16, fontWeight: "600", color: INK },
  input: { borderWidth: 1.5, borderColor: "#DBEAFE", backgroundColor: "#F8FAFF", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: INK },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  btnSolid: { backgroundColor: BLUE },
  btnGhost: { backgroundColor: "#EFF6FF" },
  btnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});