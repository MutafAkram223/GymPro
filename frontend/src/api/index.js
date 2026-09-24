import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

export const getDashboardStats = () => api.get('/dashboard');
export const getMembers = () => api.get('/members');
export const createMember = (data) => api.post('/members', data);
export const updateMember = (id, data) => api.put(`/members/${id}`, data);
export const deleteMember = (id) => api.delete(`/members/${id}`);
export const createSubscription = (memberId, data) => api.post(`/members/${memberId}/subscriptions`, data);
export const updateSubscription = (subId, data) => api.put(`/subscriptions/${subId}`, data);
export const markAttendance = (data) => api.post('/attendance', data);

export default api;
