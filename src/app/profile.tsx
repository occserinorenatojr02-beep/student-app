import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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
import { initials, setProfile, useProfile } from "../lib/profileStore";
import type { Profile } from "../lib/profileStore";

const BLUE = "#2563EB";
const INK = "#1E1B3A";
const MUTED = "#6B7280";
const TAB_BAR_HEIGHT = 100; // adjust to match your tab bar height

// Matches the shape returned by GET /admin
type Admin = {
  id: number;
  admin_number: string;
  name: string;
  role: string;
  office: string;
  email: string;
  phone: string;
  status: string;
  access: string[]; // e.g. ["students", "grades", "schedules"]
};

// The profile store keeps the same 5 fields, so the admin is mapped onto them:
//   studentId -> admin_number, program -> office, year -> role
const fields: {
  key: keyof Profile;
  label: string;
  editable: boolean;
  keyboard?: "email-address";
}[] = [
  { key: "name", label: "Full name", editable: true },
  { key: "studentId", label: "Admin ID", editable: false },
  { key: "program", label: "Office", editable: true },
  { key: "year", label: "Role", editable: false },
  { key: "email", label: "Email", editable: true, keyboard: "email-address" },
];

// Accepts either the admin object, a { data: {...} } wrapper or a list (first admin)
const toAdmin = (value: any): Admin | null => {
  const item = Array.isArray(value) ? value[0] : value?.data ?? value;
  return item && item.id != null ? (item as Admin) : null;
};

// "students" -> "Students"
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Always-current copies, so async code never works with stale values
  const mounted = useRef(true);
  const profileRef = useRef(profile);
  const editingRef = useRef(editing);
  profileRef.current = profile;
  editingRef.current = editing;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Load the admin from the backend and copy it into the profile store
  const load = useCallback(async () => {
    try {
      const res = await api.get("/admin");
      if (!mounted.current) return;

      const found = toAdmin(res.data);

      setError(false);
      setAdmin(found);

      if (found) {
        const synced: Profile = {
          ...profileRef.current,
          name: found.name,
          studentId: found.admin_number,
          program: found.office,
          year: found.role,
          email: found.email,
        };
        setProfile(synced);
        // Never overwrite what the user is typing
        if (!editingRef.current) setDraft(synced);
      }
    } catch (e) {
      console.log("ADMIN PROFILE ERROR:", e);
      if (mounted.current) setError(true);
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Run once when the screen opens
  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    if (editing) return; // don't reload while the user is editing
    setRefreshing(true);
    load();
  };

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

    // Admin not loaded from the server: keep the change on the device only
    if (!admin) {
      setProfile({ ...draft, name });
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<Admin>(`/admins/${admin.id}`, {
        name,
        email: draft.email.trim(),
        office: draft.program.trim(),
      });

      if (!mounted.current) return;

      const updated = res.data;
      setAdmin(updated);
      setProfile({
        ...profile,
        name: updated.name,
        studentId: updated.admin_number,
        program: updated.office,
        year: updated.role,
        email: updated.email,
      });
      setEditing(false);
    } catch (e: any) {
      console.log("ADMIN SAVE ERROR:", e?.response?.data ?? e);

      const data = e?.response?.data;
      const firstError = data?.errors ? (Object.values(data.errors)[0] as string[])[0] : null;
      const offline = e?.request && !e?.response ? "Cannot reach the server. Check your connection." : null;

      Alert.alert(
        "Save failed",
        firstError || data?.message || offline || "Unable to save your profile. Please try again."
      );
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const shown = editing ? draft : profile;

  // Extra details that only exist on the backend (read-only)
  const details: { label: string; value?: string }[] = admin
    ? [
        { label: "Status", value: admin.status },
        { label: "Phone", value: admin.phone },
      ]
    : [];

  const access = admin?.access ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_HEIGHT + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BLUE]} />
            }
          >
            {/* Notice when the backend data could not be used */}
            {error ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  Unable to reach the server. Showing saved profile. Pull down to retry.
                </Text>
              </View>
            ) : !admin ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>No admin record found on the server.</Text>
              </View>
            ) : null}

            {/* Identity card */}
            <View style={styles.identity}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{initials(shown.name)}</Text></View>
              <Text style={styles.name}>{shown.name || "Your name"}</Text>
              <Text style={styles.program}>{shown.year || "Role"}</Text>
            </View>

            {/* Main details */}
            <View style={styles.card}>
              {fields.map((f, i) => (
                <View
                  key={f.key}
                  style={[
                    styles.field,
                    editing && styles.fieldEdit,
                    i < fields.length - 1 && !editing && styles.divider,
                  ]}
                >
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  {editing && f.editable ? (
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

            {/* What this admin can access */}
            {!editing && access.length > 0 && (
              <View style={[styles.card, { marginTop: 14 }]}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Access</Text>
                  <View style={styles.accessWrap}>
                    {access.map((a) => (
                      <View key={a} style={styles.chip}>
                        <Text style={styles.chipText}>{label(a)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
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
  fieldEdit: { paddingVertical: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#EEF2F7" },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: MUTED, marginBottom: 4 },
  fieldValue: { fontSize: 16, fontWeight: "600", color: INK },
  input: {
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#F8FAFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    color: INK,
    height: 38,
  },

  accessWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: { backgroundColor: "#DBEAFE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: "#1D4ED8", fontWeight: "800", fontSize: 12 },

  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  btnSolid: { backgroundColor: BLUE },
  btnGhost: { backgroundColor: "#EFF6FF" },
  btnText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
});