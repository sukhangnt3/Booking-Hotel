import apiClient from "./apiClient";

export const hotelService = {
  // 1. Lấy chi tiết khách sạn (Dùng cho HotelDetailPage)
  getHotelById: async (id) => {
    try {
      const response = await apiClient.get(`/hotels/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error in getHotelById:", error);
      throw error;
    }
  },

  getHotelReviews: async (hotelId) => {
    try {
      const response = await apiClient.get(`/hotels/${hotelId}/reviews`);
      return response.data;
    } catch (error) {
      console.error("Lỗi lấy bình luận:", error);
      throw error;
    }
  },

  // 2. Lấy loại chỗ nghỉ (Dùng cho HomePage)
  getPropertyTypes: async () => {
    try {
      const response = await apiClient.get("/hotels/property-types");
      return response.data;
    } catch (error) {
      console.error("Error in getPropertyTypes:", error);
      throw error;
    }
  },

  // 3. API gợi ý địa điểm (dùng cho thanh tìm kiếm)
  searchDestinations: async (keyword) => {
    const response = await apiClient.get("/hotels/destinations", {
      params: { q: keyword },
    });
    return response.data;
  },

  // 4. API lấy danh sách khách sạn theo bộ lọc
  searchHotels: async (filters) => {
    const response = await apiClient.get("/hotels/search", {
      params: filters,
    });
    return response.data;
  },

  // 5. Lấy điểm đến thịnh hành (HomePage)
  getTrendingDestinations: async () => {
    const response = await apiClient.get("/hotels/trending-destinations");
    return response.data;
  },

  // 6. Lấy danh sách khám phá Việt Nam (HomePage)
  getDiscoverVietnam: async () => {
    const response = await apiClient.get("/hotels/discover-vietnam");
    return response.data;
  },

  // 7. Lấy danh sách chỗ nghỉ độc đáo (HomePage)
  getUniqueStays: async () => {
    const response = await apiClient.get("/hotels/unique-stays");
    return response.data;
  },

  // ==================== BẢNG 24: FAVORITES ====================

  // 8. Thêm/Xóa khách sạn khỏi danh sách yêu thích
  toggleFavorite: async (hotelId) => {
    try {
      const response = await apiClient.post(`/hotels/${hotelId}/favorite`);
      return response.data;
    } catch (error) {
      console.error("Lỗi toggle favorite:", error);
      throw error;
    }
  },

  // 9. Lấy danh sách khách sạn đã yêu thích của User (Bóc tách dữ liệu thông minh)
  getFavoriteHotels: async () => {
    try {
      const response = await apiClient.get("/users/favorites");

      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      } else if (response.data && Array.isArray(response.data.favorites)) {
        return response.data.favorites;
      }

      return [];
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu thích:", error);
      return [];
    }
  },
};

export default hotelService;
