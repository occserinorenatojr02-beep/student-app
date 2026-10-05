import { useSyncExternalStore } from "react";

export type Profile = {
  name: string;
  studentId: string;
  program: string;
  year: string;
  email: string;
};

let profile: Profile = {
  name: "Juan Dela Cruz",
  studentId: "2024-0001",
  program: "BS Information Technology",
  year: "1st Year",
  email: "juan@occ.edu.ph",
};

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getProfile = () => profile;

export const setProfile = (next: Profile) => {
  profile = next;
  listeners.forEach((l) => l());
};

// Use this in any screen: const profile = useProfile();
export const useProfile = () => useSyncExternalStore(subscribe, getProfile, getProfile);

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";