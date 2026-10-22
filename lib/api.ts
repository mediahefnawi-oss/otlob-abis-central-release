import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Central API transport for the migration from local-only storage to the shared server.
 * Set EXPO_PUBLIC_API_URL to the deployed API origin, e.g. https://api.example.com.
 * Do not put secrets in EXPO_PUBLIC_* variables; they are bundled into the client.
 */
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'otlob_abis_api_token_v1';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.name = 'ApiError'; this.status = status; }
}

async function getToken(): Promise<string | null> {
  try { const token = await SecureStore.getItemAsync(TOKEN_KEY); if (token) return token; } catch {}
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function saveApiToken(token: string): Promise<void> {
  try { await SecureStore.setItemAsync(TOKEN_KEY, token); return; } catch {}
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearApiToken(): Promise<void> {
  try { await SecureStore.deleteItemAsync(TOKEN_KEY); } catch {}
  try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  if (!API_BASE) throw new ApiError('لم يتم ضبط عنوان خادم API. أضف EXPO_PUBLIC_API_URL ثم أعد بناء التطبيق.', 0);
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (authenticated) {
    const token = await getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  let response: Response;
  try { response = await fetch(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`, { ...options, headers }); }
  catch { throw new ApiError('تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.', 0); }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error || 'حدث خطأ أثناء الاتصال بالخادم', response.status);
  return payload as T;
}

export async function apiLogin(input: { phone?: string; password: string; username?: string }) {
  const result = await apiRequest<{ token: string; user: { id: string; name: string; phone: string; role: string; address: string; status: string } }>(
    '/api/auth/login', { method: 'POST', body: JSON.stringify(input) }, false,
  );
  await saveApiToken(result.token);
  return result;
}

export async function apiRegister(input: { name: string; phone: string; password: string; address?: string; role?: string; provider?: Record<string, unknown> }) {
  const result = await apiRequest<{ token: string; user: { id: string; name: string; phone: string; role: string; address: string; status: string } }>(
    '/api/auth/register', { method: 'POST', body: JSON.stringify(input) }, false,
  );
  await saveApiToken(result.token);
  return result;
}
