import axios from "axios";
import Constants from "expo-constants";

const getBaseURL = () => {
   // Set URL in .env, use that (production / hosted API)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // use the same computer that's running Expo
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return `http://${host ?? "10.213.228.16"}:8000/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 5000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export default api;