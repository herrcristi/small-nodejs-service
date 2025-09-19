import axios from 'axios';
import { useAppStore, useAuthStore } from './stores/stores.js';
import { API_BASE_URL } from './api/api.url.js';

/**
 * Default processing of login response.
 * If backend returns { token: '...', cookie: '...' } it will save token and set cookie.
 */
export async function processLoginResponse(response) {
  try {
    // give the app a chance to run custom processing
    const data = response?.data ? response.data : response;
    if (data?.token) {
      const s = useAuthStore();
      s.save({ token: data.token, expires: data.expires, raw: data });
    }
    // if only one school is active, set it as current tenantID
    let tenantID = null;
    if (Array.isArray(data?.schools) && data.schools.length == 1 && data.schools[0].status === 'active') {
      tenantID = data.schools[0].id;
      useAppStore()?.saveTenantID(tenantID);
    }

    // if server sent a cookie value in response.data.cookie, set it (may not be necessary if server uses Set-Cookie)
    if (typeof document !== 'undefined') {
      // value expected like 'sid=abc; Path=/; HttpOnly' — be careful with HttpOnly which JS cannot set/read
      const cookie = response?.data?.cookie || response?.cookie;
      if (cookie) {
        document.cookie = cookie;
      }
    }

    return { status: 200, token: data?.token, tenantID };
  } catch (e) {
    console.error('Error processing login response', e);
    return { status: 401, error: { message: e.message, error: e } };
  }
}
