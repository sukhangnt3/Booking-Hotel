// src/services/authService.js
import apiClient from "./apiClient";

export const authService = {
  login: async (email, password) => {
    return await apiClient.post("/auth/login", { email, password });
  },

  register: async (userData) => {
    return await apiClient.post("/auth/register", userData);
  },

  googleLogin: async (googleToken, extraData = {}) => {
    return await apiClient.post("/auth/google-login", {
      token: googleToken,
      ...extraData,
    });
  },

  getProfile: async () => {
    return await apiClient.get("/auth/profile");
  },

  updateProfile: async (userData) => {
    return await apiClient.put("/auth/profile", userData);
  },

  changePassword: async (oldPassword, newPassword) => {
    return await apiClient.post("/auth/change-password", {
      oldPassword,
      newPassword,
    });
  },

  logout: async () => {
    try {
      return await apiClient.post("/auth/logout");
    } catch (error) {
      console.warn("Logout warning:", error);
    }
  },
};

export default authService;
