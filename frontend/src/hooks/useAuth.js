import { useState } from 'react';
import authService from '../services/authService';
import { setToken, removeToken } from '../utils/storage';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Kiểm tra email
  const checkEmail = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authService.checkEmailExists(email);
      setLoading(false);
      return response.exists; // Trả về true/false
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Lỗi kiểm tra email');
      throw err;
    }
  };

  // Đăng nhập
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      if (data.token) {
        setToken(data.token); // Lưu token vào localStorage
      }
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Đăng nhập thất bại');
      throw err;
    }
  };

  // Đăng ký
  const register = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register({ email, password });
      if (data.token) {
        setToken(data.token);
      }
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Đăng ký thất bại');
      throw err;
    }
  };

  return {
    checkEmail,
    login,
    register,
    loading,
    error,
    setError
  };
};

export default useAuth;