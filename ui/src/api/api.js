import axios from 'axios';
import { useAuthStore, useAppStore } from '../stores/stores.js';
import { processLoginResponse, getRolesPermissions } from '../auth.js';

import { SMALL_API_URL, SMALL_API_CORS_ORIGIN } from './api.url.js';

// Default to sending credentials (cookies). Server must allow credentials and a specific origin.
const instance = axios.create({
  baseURL: SMALL_API_URL,
  withCredentials: true,
});

/**
 * request
 */
instance.interceptors.request.use((config) => {
  try {
    const tenantID = useAppStore()?.tenantID;
    if (tenantID) {
      config.headers = config.headers || {};
      config.headers['x-tenant-id'] = tenantID;
    }
    // Do NOT add Authorization header; authentication is cookie-based (HttpOnly).
  } catch (e) {
    // ignore
  }
  return config;
});

/**
 * response
 */
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    try {
      if (err.response?.status === 401) {
        const current = globalThis.location.pathname + globalThis.location.search;
        const tenantID = useAppStore()?.tenantID;

        if (!current.startsWith('/login')) {
          const loginUrl = `/login?tenantID=${encodeURIComponent(tenantID)}&next=${encodeURIComponent(current)}`;
          globalThis.location.href = loginUrl;
        }
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(err);
  }
);

/**
 * Bootstrap: restore session from cookie on app init (after page refresh)
 * Calls /users-auth/me to validate cookie and get current user data
 * Restores tenantID from localStorage if it's valid (in user's schools list)
 * If cookie is invalid, returns error (interceptor will redirect to login)
 */
export async function bootstrapAuthFromCookie() {
  try {
    const response = await instance.get('/users-auth/me');
    if (response.status === 200) {
      // restore auth store with user data (schools, username, etc.)
      processLoginResponse(response, { useCookies: true });

      // try to restore tenantID from localStorage with validation
      const appStore = useAppStore();
      const savedTenantID = appStore?.tenantID;
      if (savedTenantID && Array.isArray(response.data?.schools)) {
        // validate that tenantID is in user's schools and is active
        const isValid = response.data.schools.some((s) => s.id === savedTenantID && s.status === 'active');
        if (isValid) {
          // restore tenant from localStorage
          appStore.saveTenant(savedTenantID, getRolesPermissions(savedTenantID, response.data));
        } else {
          // invalid tenantID; clear it
          appStore.saveTenant(null, null);
        }
      }

      return { status: 200, user: response.data };
    }
  } catch (e) {
    if (e.response?.status === 401) {
      // no valid cookie; user is not authenticated
      return { status: 401, error: 'Not authenticated' };
    }

    return { status: 401, error: e.message };
  }
}

const Api = {
  // Schools API
  getSchools: (params) => instance.get(`/schools?${params}`),
  getSchool: (id) => instance.get(`/schools/${id}`),
  createSchool: (data) => instance.post(`/schools`, data),
  updateSchool: (id, data) => instance.put(`/schools/${id}`, data),
  deleteSchool: (id) => instance.delete(`/schools/${id}`),

  // Admins API
  getAdmins: (params) => instance.get(`/admins?${params}`),
  getAdmin: (id) => instance.get(`/admins/${id}`),
  createAdmin: (data) =>
    Api.invite({
      email: data.email /*new user email*/,
      school: { role: 'admin' },
    }),
  updateAdmin: (id, data) => Api.updateUser(id, data),
  deleteAdmin: (id) => instance.delete(`/admins/${id}`),

  // Students API
  getStudents: (params) => instance.get(`/students?${params}`),
  getStudent: (id) => instance.get(`/students/${id}`),
  createStudent: (data) =>
    Api.invite({
      email: data.email /*new user email*/,
      school: { role: 'student' },
    }),
  updateStudent: (id, data) => Api.updateUser(id, data),
  deleteStudent: (id) => instance.delete(`/students/${id}`),
  updateStudentClasses: (id, newIds, removeIds) =>
    instance.patch(`/students/${id}`, {
      add: {
        classes: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        classes: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),

  // Professors API
  getProfessors: (params) => instance.get(`/professors?${params}`),
  getProfessor: (id) => instance.get(`/professors/${id}`),
  createProfessor: (data) =>
    Api.invite({
      email: data.email /*new user email*/,
      school: { role: 'professor' },
    }),
  updateProfessor: (id, data) => Api.updateUser(id, data),
  deleteProfessor: (id) => instance.delete(`/professors/${id}`),
  updateProfessorClasses: (id, newIds, removeIds) =>
    instance.patch(`/professors/${id}`, {
      add: {
        classes: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        classes: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),

  // Groups API
  getGroups: (params) => instance.get(`/groups?${params}`),
  getGroup: (id) => instance.get(`/groups/${id}`),
  createGroup: (data) => instance.post(`/groups`, { ...data, students: data.students || [] }),
  updateGroup: (id, data) => instance.put(`/groups/${id}`, data),
  deleteGroup: (id) => instance.delete(`/groups/${id}`),
  updateGroupStudents: (id, newIds, removeIds) =>
    instance.patch(`/groups/${id}`, {
      add: {
        students: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        students: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),

  // Locations API
  getLocations: (params) => instance.get(`/locations?${params}`),
  getLocation: (id) => instance.get(`/locations/${id}`),
  createLocation: (data) => instance.post(`/locations`, data),
  updateLocation: (id, data) => instance.put(`/locations/${id}`, data),
  deleteLocation: (id) => instance.delete(`/locations/${id}`),

  // Events API
  getEvents: (params) => instance.get(`/events?${params}`),
  getEvent: (id) => instance.get(`/events/${id}`),

  // Classes API
  getClasses: (params) => instance.get(`/classes?${params}`),
  getClass: (id) => instance.get(`/classes/${id}`),
  createClass: (data) => instance.post(`/classes`, data),
  updateClass: (id, data) => instance.put(`/classes/${id}`, data),
  deleteClass: (id) => instance.delete(`/classes/${id}`),

  // Schedules API
  getSchedules: (params) => instance.get(`/schedules?${params}`),
  getSchedule: (id) => instance.get(`/schedules/${id}`),
  createSchedule: (data) =>
    instance.post(`/schedules`, {
      ...data,
      schedules: data.schedules || [],
      professors: data.professors || [],
      groups: data.groups || [],
      students: data.students || [],
    }),
  updateSchedule: (id, data) => instance.put(`/schedules/${id}`, data),
  deleteSchedule: (id) => instance.delete(`/schedules/${id}`),
  updateScheduleInnerSchedules: (id, newObjs, removeObjs) =>
    instance.patch(`/schedules/${id}`, {
      add: {
        schedules: (newObjs || []).map((item) => {
          return { frequency: item.frequency, timestamp: item.timestamp, location: item.location, status: item.status };
        }),
      },
      remove: {
        schedules: (removeObjs || []).map((id) => {
          return { id };
        }),
      },
    }),
  updateScheduleGroups: (id, newIds, removeIds) =>
    instance.patch(`/schedules/${id}`, {
      add: {
        groups: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        groups: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),
  updateScheduleProfessors: (id, newIds, removeIds) =>
    instance.patch(`/schedules/${id}`, {
      add: {
        professors: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        professors: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),
  updateScheduleStudents: (id, newIds, removeIds) =>
    instance.patch(`/schedules/${id}`, {
      add: {
        students: (newIds || []).map((id) => {
          return { id };
        }),
      },
      remove: {
        students: (removeIds || []).map((id) => {
          return { id };
        }),
      },
    }),

  // Users API
  getUser: (id) => instance.get(`/users/${id}`),
  updateUser: (id, data) => instance.put(`/users/${id}`, data),

  // Auth
  // Cookie-based auth by default (withCredentials true)
  login: (credentials, withCreds = true) =>
    instance.post('/users-auth/login', credentials, { withCredentials: withCreds }),
  logout: (withCreds = true) => instance.post('/users-auth/logout', {}, { withCredentials: withCreds }),

  resetUserPassword: (data) => instance.post(`/users-auth/reset-password`, data),

  currentUsername: () => useAuthStore()?.raw?.username /*current username*/,

  updateUserPassword: (data) => instance.put(`/users-auth/password`, data),
  updateUsername: (data) => instance.put(`/users-auth/id`, data),

  deleteUser: () => instance.delete(`/users-auth`),

  invite: (data) => instance.post(`/users-auth/invite`, data),

  updateUserSchool: (uid, data) => instance.patch(`/users-auth/school/user/${uid}`, data),

  // Auth for portal admin
  // signup new school
  signup: (data) => instance.post(`/users-auth/invite`, data),
};

export default Api;
