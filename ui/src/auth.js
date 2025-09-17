import axios from 'axios';
import { API_BASE_URL } from './api/api.url.js';

const STORAGE_KEY = 'app.auth';

/**
 * set auth
 */
export function setAuth(obj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save auth to localStorage', e);
  }
}

/**
 * get auth
 */
export function getAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get auth localStorage', e);
    return null;
  }
}

/**
 * clear auth
 */
export function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear auth localStorage', e);
  }
}

/**
 * Default processing of login response.
 * If backend returns { token: '...', cookie: '...' } it will save token and set cookie.
 */
export async function processLoginResponse(response) {
  try {
    console.log('Processing login response', response);

    // give the app a chance to run custom processing
    try {
      const data = response?.data ? response.data : response;
      if (data?.token) {
        const s = useAuthStore();
        s.save({ token: data.token, raw: data });
      }
    } catch (e) {
      console.error('Error in custom processor', e);
    }

    const data = response?.data ? response.data : response;
    if (data?.token) {
      setAuth({ token: data.token, raw: data });
    }

    // if server sent a cookie value in response.data.cookie, set it (may not be necessary if server uses Set-Cookie)
    if (data?.cookie && typeof document !== 'undefined') {
      // value expected like 'sid=abc; Path=/; HttpOnly' — be careful with HttpOnly which JS cannot set/read
      document.cookie = data.cookie;
    }

    return getAuth();
  } catch (e) {
    console.error('Error processing login response', e);
    return null;
  }
}

export function getAuthToken() {
  const auth = getAuth();
  return auth?.token || null;
}
