import { View } from "react-native";
import { Stack } from "expo-router";
import BottomNav from "@/components/BottomNav";

export default function Layout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#2563EB" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Student Portal" }} />
        <Stack.Screen name="students" options={{ title: "Students" }} />
        <Stack.Screen name="student/[id]" options={{ title: "Student Profile" }} />
        <Stack.Screen name="courses" options={{ title: "Courses" }} />
        <Stack.Screen name="schedules" options={{ title: "Schedules" }} />
        <Stack.Screen name="grades" options={{ title: "Grades" }} />
        <Stack.Screen name="announcements" options={{ title: "Announcements" }} />
        <Stack.Screen name="school" options={{ title: "School" }} />
        <Stack.Screen name="profile" options={{ title: "Profile" }} />
        <Stack.Screen name="subject" options={{ title: "Subjects" }} />
      </Stack>
      <BottomNav />
    </View>
  );
}