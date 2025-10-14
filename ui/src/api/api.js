import axios from 'axios';
import { processLoginResponse, getAuthToken } from '../auth.js';
import { useAuthStore, useAppStore } from '../stores/stores.js';

import { API_BASE_URL } from './api.url.js';

// Do NOT send credentials by default to avoid CORS preflight failure when server
// returns Access-Control-Allow-Origin: * while withCredentials is true.
// If you need to send cookies, pass { withCredentials: true } explicitly to the call
const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

/**
 * Token refresh handling
 */
const Refresh = {
  isRefreshing: false,
  refreshQueue: [],

  enqueueRefresh: (cb) => {
    refreshQueue.push(cb);
  },

  processQueue: (error, token = null) => {
    refreshQueue.forEach((cb) => cb(error, token));
    refreshQueue = [];
  },
};

/**
 * request
 */
instance.interceptors.request.use((config) => {
  try {
    // token
    const token = useAuthStore()?.token;

    // tenantID
    const tenantID = useAppStore()?.tenantID;

    // add to headers
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
      if (tenantID) {
        config.headers['x-tenant-id'] = tenantID;
      }
    }
  } catch (e) {}
  return config;
});

/**
 * response
 */
instance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    let useRefresh = false;

    try {
      if (useRefresh && err.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // attempt to refresh token if possible
        if (!Refresh.isRefreshing) {
          Refresh.isRefreshing = true;
          try {
            // call refresh endpoint
            const refreshResp = await instance.post('/auth/refresh');
            // let auth processing save token into store/localStorage
            const rLogin = await processLoginResponse(refreshResp);
            if (rLogin.error || !rLogin.token) {
              return Promise.reject(rLogin.error.error);
            }

            const newToken = r.token;
            Refresh.processQueue(null, newToken);
            Refresh.isRefreshing = false;
            return instance(originalRequest);
          } catch (refreshErr) {
            Refresh.processQueue(refreshErr, null);
            Refresh.isRefreshing = false;
            // redirect to login
            const current = window.location.pathname + window.location.search;
            const tenantID = useAppStore()?.tenantID;
            const loginUrl = `/login?tenantID=${encodeURIComponent(tenantID)}&next=${encodeURIComponent(current)}`;
            window.location.href = loginUrl;

            return Promise.reject(refreshErr);
          }
        }

        // queue the request until refresh finishes
        return new Promise((resolve, reject) => {
          Refresh.enqueueRefresh((error, token) => {
            if (error) {
              return reject(error);
            }
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
        });
      }
    } catch (e) {
      // fall through
    }

    try {
      if (err.response?.status === 401) {
        const current = window.location.pathname + window.location.search;
        const tenantID = useAppStore()?.tenantID;

        if (!current.startsWith('/login')) {
          const loginUrl = `/login?tenantID=${encodeURIComponent(tenantID)}&next=${encodeURIComponent(current)}`;
          window.location.href = loginUrl;
        }
      }
    } catch (e) {}
    return Promise.reject(err);
  }
);

const Api = {
  // Schools API
  getSchools: (params) => instance.get(`/schools?${params}`),
  getSchool: (id) => instance.get(`/schools/${id}`),
  createSchool: (data) => instance.post(`/schools`, data),
  updateSchool: (id, data) => instance.put(`/schools/${id}`, data),
  deleteSchool: (id) => instance.delete(`/schools/${id}`),

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
  // Pass withCreds=true if you need to send cookies (server must allow credentials)
  login: (credentials, withCreds = false) =>
    instance.post('/users-auth/login', credentials, { withCredentials: withCreds }),
  logout: (withCreds = false) => instance.post('/users-auth/logout', {}, { withCredentials: withCreds }),

  resetUserPassword: (data) => instance.post(`/users-auth/reset-password`, data),

  currentUserEmailID: () => useAuthStore()?.raw?.email /*current user email*/,

  updateUserPassword: (data) =>
    instance.put(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}/password`, data),
  updateUserEmail: (data) => instance.put(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}/id`, data),

  deleteUser: () => instance.delete(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}`),

  invite: (data) => instance.post(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}/invite`, data),

  updateUserSchool: (uid, data) =>
    instance.patch(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}/school/user/${uid}`, data),

  // Auth for portal admin
  // signup new school
  signup: (data) => instance.post(`/users-auth/${encodeURIComponent(Api.currentUserEmailID())}/invite`, data),
};

export default Api;
