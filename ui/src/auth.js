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
      useAppStore()?.saveTenant(tenantID, getRolesPermissions(tenantID, data));
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

/**
 * get current roles permissions
 * normally this should be returned by backend on login
 */
export function getRolesPermissions(tenantID, loginData) {
  try {
    // filter for current tenantID and active status
    let schools = Array.isArray(loginData?.schools) ? loginData.schools : [];
    schools = schools.filter((s) => s.id === tenantID && s.status === 'active');

    const roles = schools.length > 0 && Array.isArray(schools[0].roles) ? schools[0].roles : [];

    // create roles map
    let isAtLeast = {
      student: 0,
      teacher: 0,
      admin: 0,
      portalAdmin: 0,
    };
    for (const role of roles) {
      if (role == 'student') {
        isAtLeast.student = 1;
      } else if (role == 'teacher') {
        isAtLeast.student = 1;
        isAtLeast.teacher = 1;
      } else if (role == 'admin') {
        isAtLeast.student = 1;
        isAtLeast.teacher = 1;
        isAtLeast.admin = 1;
      } else if (role == 'portal-admin') {
        // portal-admin does not have access to school internal data
        isAtLeast.portalAdmin = 1;
      }
    }

    const permissions = {
      schools: { read: isAtLeast.portalAdmin, write: isAtLeast.portalAdmin },
      admins: { read: isAtLeast.portalAdmin, write: isAtLeast.portalAdmin },

      students: { read: isAtLeast.student, write: isAtLeast.admin },
      professors: { read: isAtLeast.student, write: isAtLeast.admin },
      groups: { read: isAtLeast.student, write: isAtLeast.admin },
      locations: { read: isAtLeast.student, write: isAtLeast.admin },
      classes: { read: isAtLeast.student, write: isAtLeast.admin },
      schedules: { read: isAtLeast.student, write: isAtLeast.admin },

      events: { read: isAtLeast.admin, write: 0 },
    };

    return permissions;
  } catch (e) {
    console.error('Error processing roles permissions', e);
    return null;
  }
}
