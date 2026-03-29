import axios from 'axios';
import type { AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider = async () => null;
const DEBUG_AUTH = process.env.EXPO_PUBLIC_DEBUG_AUTH === '1';
const protectedPrefixes = ['/users', '/messages', '/notifications'];
const API_TIMEOUT_MS = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || '25000', 10);
const API_RETRY_ATTEMPTS = Math.max(parseInt(process.env.EXPO_PUBLIC_API_RETRY_ATTEMPTS || '2', 10), 0);
const API_RETRY_DELAY_MS = Math.max(parseInt(process.env.EXPO_PUBLIC_API_RETRY_DELAY_MS || '900', 10), 250);

export const setAuthTokenProvider = (provider: TokenProvider) => {
  tokenProvider = provider;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const ensureApiPath = (baseUrl: string): string => {
  if (/\/api(?:$|\/)/i.test(baseUrl)) return baseUrl;
  return `${baseUrl}/api`;
};

const resolveHost = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return ensureApiPath(normalizeBaseUrl(fromEnv));

  const explicit = Constants?.expoConfig?.extra?.API_URL as string | undefined;
  if (explicit) return ensureApiPath(normalizeBaseUrl(explicit));

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
export const SERVER_ROOT_URL = API_URL.replace(/\/api$/, '');
console.log(`[api] resolved API_URL=${API_URL} SERVER_ROOT_URL=${SERVER_ROOT_URL}`);

type RetryableConfig = AxiosRequestConfig & {
  __retryCount?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let warmupPromise: Promise<void> | null = null;

const warmBackend = async (): Promise<void> => {
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      await fetch(`${SERVER_ROOT_URL}/health`, { signal: controller.signal });
    } catch {
      // Best-effort warmup only.
    } finally {
      clearTimeout(timeout);
      warmupPromise = null;
    }
  })();

  return warmupPromise;
};

export const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const method = String(config.method || 'get').toUpperCase();
      const url = (config.baseURL || '') + (config.url || '');
      console.log('[api] request:', method, url);
    } catch (e) {
      // ignore
    }
    // Inject Clerk JWT automatically for protected endpoints.
    if (!config.headers?.Authorization) {
      const token = await tokenProvider();
      const requestPath = typeof config.url === 'string' ? config.url : '';
      const isProtectedPath = protectedPrefixes.some((prefix) => requestPath.startsWith(prefix));

      if (DEBUG_AUTH) {
        const preview = token ? `${token.slice(0, 16)}...` : null;
        console.log('Auth token debug', {
          method: config.method,
          url: requestPath,
          hasToken: Boolean(token),
          tokenPreview: preview,
        });
      }

      if (!token && isProtectedPath) {
        console.warn('Missing auth token for protected request', {
          method: config.method,
          url: requestPath,
        });
      }

      if (token) {
        const nextHeaders = (config.headers ?? {}) as AxiosRequestHeaders;
        nextHeaders.Authorization = `Bearer ${token}`;
        config.headers = nextHeaders;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    try {
      const reqUrl = (error?.config?.baseURL || '') + (error?.config?.url || '');
      console.error('[api] response error:', reqUrl, 'status=', error?.response?.status, 'message=', error?.message);
    } catch (e) {
      // ignore
    }
    const config = error?.config as RetryableConfig | undefined;
    const method = String(config?.method || 'get').toLowerCase();
    const isIdempotent = method === 'get' || method === 'head' || method === 'options';
    const status = error?.response?.status as number | undefined;
    const isRetryableStatus = Boolean(status && [408, 429, 500, 502, 503, 504].includes(status));
    const isNetworkFailure = error?.message === 'Network Error';
    const isTimeoutFailure = error?.code === 'ECONNABORTED';
    const retryCount = config?.__retryCount || 0;

    if (
      config &&
      API_RETRY_ATTEMPTS > 0 &&
      isIdempotent &&
      retryCount < API_RETRY_ATTEMPTS &&
      (isRetryableStatus || isNetworkFailure || isTimeoutFailure)
    ) {
      config.__retryCount = retryCount + 1;
      if (isNetworkFailure) {
        await warmBackend();
      }
      await sleep(API_RETRY_DELAY_MS * config.__retryCount);
      return api.request(config);
    }

    if (error?.message === 'Network Error') {
      console.error('Network Error: unable to reach backend', {
        baseURL: API_URL,
        method: error?.config?.method,
        url: error?.config?.url,
        timeoutMs: API_TIMEOUT_MS,
        retries: config?.__retryCount || 0,
      });
    }
    if (error?.response?.status === 401) {
      console.error('Unauthorized request (401)', {
        baseURL: API_URL,
        method: error?.config?.method,
        url: error?.config?.url,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
