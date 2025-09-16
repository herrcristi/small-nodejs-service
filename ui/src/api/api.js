import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1'; // Adjust the base URL as needed

const Api = {
  // Schools API
  getSchools: (params) => axios.get(`${API_BASE_URL}/schools?${params}`),
  createSchool: (data) => axios.post(`${API_BASE_URL}/schools`, data),
  updateSchool: (id, data) => axios.put(`${API_BASE_URL}/schools/${id}`, data),
  deleteSchool: (id) => axios.delete(`${API_BASE_URL}/schools/${id}`),

  // Students API
  getStudents: (params) => axios.get(`${API_BASE_URL}/students?${params}`),
  createStudent: (data) => axios.post(`${API_BASE_URL}/students`, data),
  updateStudent: (id, data) => axios.put(`${API_BASE_URL}/students/${id}`, data),
  deleteStudent: (id) => axios.delete(`${API_BASE_URL}/students/${id}`),

  // Professors API
  getProfessors: (params) => axios.get(`${API_BASE_URL}/professors?${params}`),
  createProfessor: (data) => axios.post(`${API_BASE_URL}/professors`, data),
  updateProfessor: (id, data) => axios.put(`${API_BASE_URL}/professors/${id}`, data),
  deleteProfessor: (id) => axios.delete(`${API_BASE_URL}/professors/${id}`),

  // Groups API
  getGroups: (params) => axios.get(`${API_BASE_URL}/groups?${params}`),
  createGroup: (data) => axios.post(`${API_BASE_URL}/groups`, data),
  updateGroup: (id, data) => axios.put(`${API_BASE_URL}/groups/${id}`, data),
  deleteGroup: (id) => axios.delete(`${API_BASE_URL}/groups/${id}`),

  // Locations API
  getLocations: (params) => axios.get(`${API_BASE_URL}/locations?${params}`),
  createLocation: (data) => axios.post(`${API_BASE_URL}/locations`, data),
  updateLocation: (id, data) => axios.put(`${API_BASE_URL}/locations/${id}`, data),
  deleteLocation: (id) => axios.delete(`${API_BASE_URL}/locations/${id}`),

  // Events API
  getEvents: (params) => axios.get(`${API_BASE_URL}/events?${params}`),
  createEvent: (data) => axios.post(`${API_BASE_URL}/events`, data),
  updateEvent: (id, data) => axios.put(`${API_BASE_URL}/events/${id}`, data),
  deleteEvent: (id) => axios.delete(`${API_BASE_URL}/events/${id}`),

  // Classes API
  getClasses: (params) => axios.get(`${API_BASE_URL}/classes?${params}`),
  createClass: (data) => axios.post(`${API_BASE_URL}/classes`, data),
  updateClass: (id, data) => axios.put(`${API_BASE_URL}/classes/${id}`, data),
  deleteClass: (id) => axios.delete(`${API_BASE_URL}/classes/${id}`),

  // Schedules API
  getSchedules: (params) => axios.get(`${API_BASE_URL}/schedules?${params}`),
  createSchedule: (data) => axios.post(`${API_BASE_URL}/schedules`, data),
  updateSchedule: (id, data) => axios.put(`${API_BASE_URL}/schedules/${id}`, data),
  deleteSchedule: (id) => axios.delete(`${API_BASE_URL}/schedules/${id}`),
};

export default Api;
