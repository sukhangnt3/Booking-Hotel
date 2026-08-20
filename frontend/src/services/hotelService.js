import apiClient from "./apiClient";
import { useAuthStore } from "@/stores/authStore";

const mapHotelData = (item) => {
  if (!item) return null;
  return {
    ...item,
    id: item.id || item.hotel_id || item._id,
    image:
      item.image ||
      item.imageUrl ||
      item.path ||
      item.images?.[0]?.path ||
      item.images?.[0],
  };
};

export const hotelService = {
  // ─── 1. CHI TIẾT & DANH SÁCH ───
  getAll: (params) => apiClient.get("/hotels", { params }),

  getById: async (id) => {
    const res = await apiClient.get(`/hotels/${id}`);
    const data = res?.data || res;
    return mapHotelData(data);
  },
  getHotelById: async (id) => {
    const res = await apiClient.get(`/hotels/${id}`);
    const data = res?.data || res;
    return mapHotelData(data);
  },

  // ─── 2. TÌM KIẾM ───
  searchHotels: (filters) =>
    apiClient.get("/hotels/search", { params: filters }),

  searchDestinations: (keyword) =>
    apiClient.get("/hotels/destinations", { params: { q: keyword } }),

  // ─── 3. TRANG CHỦ (HOMEPAGE SECTIONS) ───
  getPropertyTypes: () => apiClient.get("/hotels/property-types"),

  getTrendingDestinations: () => apiClient.get("/hotels/trending-destinations"),

  getDiscoverVietnam: () => apiClient.get("/hotels/discover-vietnam"),

  getUniqueStays: () => apiClient.get("/hotels/unique-stays"),

  // ─── 4. ĐÁNH GIÁ (REVIEWS) ───
  getReviews: async (hotelId, params) => {
    try {
      const res = await apiClient.get(`/hotels/${hotelId}/reviews`, { params });
      return res?.data || res || [];
    } catch {
      return []; // Nếu chưa có review hoặc 404 thì trả về mảng rỗng, không sập trang
    }
  },

  getHotelReviews: async (hotelId, params) => {
    try {
      const res = await apiClient.get(`/hotels/${hotelId}/reviews`, { params });
      return res?.data || res || [];
    } catch {
      return [];
    }
  },

  // ─── 5. YÊU THÍCH (FAVORITES) - ĐÃ SỬA CHỐNG BỊ ĐÁ RA LOGIN ───
  getFavorites: async () => {
    // 👈 KIỂM TRA ĐĂNG NHẬP TRƯỚC: Chưa login thì trả về [] ngay, KHÔNG gọi API
    const token =
      useAuthStore.getState().token || useAuthStore.getState().systemToken;
    if (!token) return [];

    try {
      const res = await apiClient.get(`/users/favorites?_t=${Date.now()}`);
      const list = res?.favorites || res?.data || res;
      return Array.isArray(list)
        ? list.map((item) => mapHotelData(item.hotel || item))
        : [];
    } catch {
      return [];
    }
  },

  getFavoriteHotels: async () => {
    // 👈 KIỂM TRA ĐĂNG NHẬP TRƯỚC: Chưa login thì trả về [] ngay, KHÔNG gọi API
    const token =
      useAuthStore.getState().token || useAuthStore.getState().systemToken;
    if (!token) return [];

    try {
      const res = await apiClient.get(`/users/favorites?_t=${Date.now()}`);
      const list = res?.favorites || res?.data || res;
      return Array.isArray(list)
        ? list.map((item) => mapHotelData(item.hotel || item))
        : [];
    } catch {
      return [];
    }
  },

  addFavorite: (hotelId) => apiClient.post(`/hotels/${hotelId}/favorite`),

  removeFavorite: (hotelId) => apiClient.delete(`/hotels/${hotelId}/favorite`),

  // ─── 6. ADMIN & OWNER CRUD ───
  create: (data) => apiClient.post("/hotels", data),

  update: (id, data) => apiClient.put(`/hotels/${id}`, data),

  delete: (id) => apiClient.delete(`/hotels/${id}`),

  uploadImages: (id, formData) =>
    apiClient.post(`/hotels/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default hotelService;
