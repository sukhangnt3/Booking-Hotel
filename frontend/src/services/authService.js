import apiClient from './apiClient';

export const authService = {
  // Gọi API Đăng nhập
  login: async (email, password) => {
    return await apiClient.post('/auth/login', { email, password });
  },

  // Gọi API Đăng ký
  register: async (userData) => {
    return await apiClient.post('/auth/register', userData);
  },
};

export default authService;