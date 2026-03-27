import axios from 'axios';
import Constants from 'expo-constants';

const resolveHost = () => {
  const explicit = Constants?.expoConfig?.extra?.API_URL;
  if (explicit) return explicit;

  const hostUri = Constants?.expoConfig?.hostUri || Constants?.expoGoConfig?.debuggerHost;
  const host = hostUri ? hostUri.split(':')[0] : null;
  if (host) return `http://${host}:3000/api`;

  return 'http://localhost:3000/api';
};

const API_URL = resolveHost();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Add token to headers if available
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle errors globally
    return Promise.reject(error);
  }
);

export default api;
