import axios from 'axios';
import { useAuthStore } from './stores/stores.js';
import { API_BASE_URL } from './api/api.url.js';

/**
 * Default processing of login response.
 * If backend returns { token: '...', cookie: '...' } it will save token and set cookie.
 */
export async function processLoginResponse(response) {
  try {
    console.log('Processing login response', response); // TODO debug, remove it

    // give the app a chance to run custom processing
    const data = response?.data ? response.data : response;
    if (data?.token) {
      const s = useAuthStore();
      s.save({ token: data.token, raw: data });
    }

    // if server sent a cookie value in response.data.cookie, set it (may not be necessary if server uses Set-Cookie)
    if (typeof document !== 'undefined') {
      // value expected like 'sid=abc; Path=/; HttpOnly' — be careful with HttpOnly which JS cannot set/read
      const cookie = response?.data?.cookie || response?.cookie;
      if (cookie) {
        document.cookie = cookie;
      }
    }

    return { status: 200, token: data?.token };
  } catch (e) {
    console.error('Error processing login response', e);
    return { status: 401, error: { message: e.message, error: e } };
  }
}
