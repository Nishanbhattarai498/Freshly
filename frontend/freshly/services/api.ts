import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const resolveHost = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normalizeBaseUrl(fromEnv);

  const explicit = Constants?.expoConfig?.extra?.API_URL as string | undefined;
  if (explicit) return normalizeBaseUrl(explicit);

  const hostUri = Constants?.expoConfig?.hostUri || Constants?.expoGoConfig?.debuggerHost;
  let host = hostUri ? hostUri.split(':')[0] : null;
  if (host && (host === 'localhost' || host === '127.0.0.1') && Platform.OS === 'android') {
    // Android emulator cannot reach host machine via localhost.
    host = '10.0.2.2';
  }

  if (host) return `http://${host}:3000/api`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:3000/api';
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
    if (error?.message === 'Network Error') {
      console.error('Network Error: unable to reach backend', {
        baseURL: API_URL,
        method: error?.config?.method,
        url: error?.config?.url,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
