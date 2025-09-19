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
        const loginUrl = `/login?tenantID=${encodeURIComponent(tenantID)}&next=${encodeURIComponent(current)}`;
        window.location.href = loginUrl;
      }
    } catch (e) {}
    return Promise.reject(err);
  }
);

const Api = {
  // Schools API
  getSchools: (params) => instance.get(`/schools?${params}`),
  createSchool: (data) => instance.post(`/schools`, data),
  updateSchool: (id, data) => instance.put(`/schools/${id}`, data),
  deleteSchool: (id) => instance.delete(`/schools/${id}`),

  // Students API
  getStudents: (params) => instance.get(`/students?${params}`),
  createStudent: (data) => instance.post(`/students`, data),
  updateStudent: (id, data) => instance.put(`/students/${id}`, data),
  deleteStudent: (id) => instance.delete(`/students/${id}`),

  // Professors API
  getProfessors: (params) => instance.get(`/professors?${params}`),
  createProfessor: (data) => instance.post(`/professors`, data),
  updateProfessor: (id, data) => instance.put(`/professors/${id}`, data),
  deleteProfessor: (id) => instance.delete(`/professors/${id}`),

  // Groups API
  getGroups: (params) => instance.get(`/groups?${params}`),
  createGroup: (data) => instance.post(`/groups`, data),
  updateGroup: (id, data) => instance.put(`/groups/${id}`, data),
  deleteGroup: (id) => instance.delete(`/groups/${id}`),

  // Locations API
  getLocations: (params) => instance.get(`/locations?${params}`),
  createLocation: (data) => instance.post(`/locations`, data),
  updateLocation: (id, data) => instance.put(`/locations/${id}`, data),
  deleteLocation: (id) => instance.delete(`/locations/${id}`),

  // Events API
  getEvents: (params) => instance.get(`/events?${params}`),
  createEvent: (data) => instance.post(`/events`, data),
  updateEvent: (id, data) => instance.put(`/events/${id}`, data),
  deleteEvent: (id) => instance.delete(`/events/${id}`),

  // Classes API
  getClasses: (params) => instance.get(`/classes?${params}`),
  createClass: (data) => instance.post(`/classes`, data),
  updateClass: (id, data) => instance.put(`/classes/${id}`, data),
  deleteClass: (id) => instance.delete(`/classes/${id}`),

  // Schedules API
  getSchedules: (params) => instance.get(`/schedules?${params}`),
  createSchedule: (data) => instance.post(`/schedules`, data),
  updateSchedule: (id, data) => instance.put(`/schedules/${id}`, data),
  deleteSchedule: (id) => instance.delete(`/schedules/${id}`),

  // Auth
  // Pass withCreds=true if you need to send cookies (server must allow credentials)
  login: (credentials, withCreds = false) =>
    instance.post('/users-auth/login', credentials, { withCredentials: withCreds }),
  logout: (withCreds = false) => instance.post('/users-auth/logout', {}, { withCredentials: withCreds }),
};

export default Api;
