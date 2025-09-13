import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api'; // Adjust the base URL as needed

const Api = {
  // Schools API
  getSchools: () => axios.get(`${API_BASE_URL}/schools`),
  createSchool: (data) => axios.post(`${API_BASE_URL}/schools`, data),
  updateSchool: (id, data) => axios.put(`${API_BASE_URL}/schools/${id}`, data),
  deleteSchool: (id) => axios.delete(`${API_BASE_URL}/schools/${id}`),

  // Students API
  getStudents: () => axios.get(`${API_BASE_URL}/students`),
  createStudent: (data) => axios.post(`${API_BASE_URL}/students`, data),
  updateStudent: (id, data) => axios.put(`${API_BASE_URL}/students/${id}`, data),
  deleteStudent: (id) => axios.delete(`${API_BASE_URL}/students/${id}`),

  // Professors API
  getProfessors: () => axios.get(`${API_BASE_URL}/professors`),
  createProfessor: (data) => axios.post(`${API_BASE_URL}/professors`, data),
  updateProfessor: (id, data) => axios.put(`${API_BASE_URL}/professors/${id}`, data),
  deleteProfessor: (id) => axios.delete(`${API_BASE_URL}/professors/${id}`),

  // Groups API
  getGroups: () => axios.get(`${API_BASE_URL}/groups`),
  createGroup: (data) => axios.post(`${API_BASE_URL}/groups`, data),
  updateGroup: (id, data) => axios.put(`${API_BASE_URL}/groups/${id}`, data),
  deleteGroup: (id) => axios.delete(`${API_BASE_URL}/groups/${id}`),

  // Locations API
  getLocations: () => axios.get(`${API_BASE_URL}/locations`),
  createLocation: (data) => axios.post(`${API_BASE_URL}/locations`, data),
  updateLocation: (id, data) => axios.put(`${API_BASE_URL}/locations/${id}`, data),
  deleteLocation: (id) => axios.delete(`${API_BASE_URL}/locations/${id}`),

  // Events API
  getEvents: () => axios.get(`${API_BASE_URL}/events`),
  createEvent: (data) => axios.post(`${API_BASE_URL}/events`, data),
  updateEvent: (id, data) => axios.put(`${API_BASE_URL}/events/${id}`, data),
  deleteEvent: (id) => axios.delete(`${API_BASE_URL}/events/${id}`),

  // Classes API
  getClasses: () => axios.get(`${API_BASE_URL}/classes`),
  createClass: (data) => axios.post(`${API_BASE_URL}/classes`, data),
  updateClass: (id, data) => axios.put(`${API_BASE_URL}/classes/${id}`, data),
  deleteClass: (id) => axios.delete(`${API_BASE_URL}/classes/${id}`),

  // Schedules API
  getSchedules: () => axios.get(`${API_BASE_URL}/schedules`),
  createSchedule: (data) => axios.post(`${API_BASE_URL}/schedules`, data),
  updateSchedule: (id, data) => axios.put(`${API_BASE_URL}/schedules/${id}`, data),
  deleteSchedule: (id) => axios.delete(`${API_BASE_URL}/schedules/${id}`),
};

export default Api;
