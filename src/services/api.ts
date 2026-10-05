import axios from "axios";

const api = axios.create({
  baseURL: "http://10.23.157.16:8000/api",
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export default api;
