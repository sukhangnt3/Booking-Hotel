import apiClient from "./apiClient";

// Hàm bổ trợ: Đảm bảo dữ liệu nhận được LUÔN LUÔN LÀ MẢNG
const ensureArray = (response, key = null) => {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  if (key && response && Array.isArray(response[key])) return response[key];
  return [];
};

export const hotelService = {
  // 1. Lấy chi tiết khách sạn
  getHotelById: async (id) => {
    try {
      const res = await apiClient.get(`/hotels/${id}`);
      return res.data || res;
    } catch (error) {
      console.error("Error in getHotelById:", error);
      throw error;
    }
  },

  getHotelReviews: async (hotelId) => {
    try {
      const res = await apiClient.get(`/hotels/${hotelId}/reviews`);
      return ensureArray(res, "reviews");
    } catch (error) {
      console.error("Lỗi lấy bình luận:", error);
      return [];
    }
  },

  // 2. Lấy loại chỗ nghỉ (HomePage)
  getPropertyTypes: async () => {
    try {
      const res = await apiClient.get("/hotels/property-types");
      return ensureArray(res, "propertyTypes");
    } catch (error) {
      console.error("Error in getPropertyTypes:", error);
      return [];
    }
  },

  // 3. API gợi ý địa điểm
  searchDestinations: async (keyword) => {
    try {
      const res = await apiClient.get("/hotels/destinations", {
        params: { q: keyword },
      });
      return ensureArray(res, "destinations");
    } catch (error) {
      return [];
    }
  },

  // 4. API lấy danh sách khách sạn theo bộ lọc
  searchHotels: async (filters) => {
    try {
      const res = await apiClient.get("/hotels/search", {
        params: filters,
      });
      return res.data || res;
    } catch (error) {
      console.error("Error in searchHotels:", error);
      return { data: [], total: 0 };
    }
  },

  // 5. Lấy điểm đến thịnh hành (HomePage)
  getTrendingDestinations: async () => {
    try {
      const res = await apiClient.get("/hotels/trending-destinations");
      return ensureArray(res, "trending");
    } catch (error) {
      return [];
    }
  },

  // 6. Lấy danh sách khám phá Việt Nam (HomePage)
  getDiscoverVietnam: async () => {
    try {
      const res = await apiClient.get("/hotels/discover-vietnam");
      return ensureArray(res, "discover");
    } catch (error) {
      return [];
    }
  },

  // 7. Lấy danh sách chỗ nghỉ độc đáo (HomePage)
  getUniqueStays: async () => {
    try {
      const res = await apiClient.get("/hotels/unique-stays");
      return ensureArray(res, "uniqueStays");
    } catch (error) {
      return [];
    }
  },

  // ==================== BẢNG 24: FAVORITES ====================

  // 8A. THÊM KHÁCH SẠN VÀO YÊU THÍCH (GỬI REQUEST POST)
  addFavorite: async (hotelId) => {
    try {
      if (!hotelId) throw new Error("Thiếu hotelId khi thêm favorite");
      const res = await apiClient.post(`/hotels/${hotelId}/favorite`);
      return res;
    } catch (error) {
      console.error("Lỗi thêm yêu thích:", error);
      throw error;
    }
  },

  // 8B. XÓA KHÁCH SẠN KHỎI YÊU THÍCH (GỬI REQUEST DELETE)
  removeFavorite: async (hotelId, favoriteRecordId) => {
    try {
      if (!hotelId) throw new Error("Thiếu hotelId khi xóa favorite");

      try {
        const res = await apiClient.delete(`/hotels/${hotelId}/favorite`);
        return res;
      } catch (err) {
        if (favoriteRecordId) {
          return await apiClient.delete(`/users/favorites/${favoriteRecordId}`);
        }
        return await apiClient.delete(`/favorites/${hotelId}`);
      }
    } catch (error) {
      console.error("Lỗi xóa yêu thích:", error);
      throw error;
    }
  },

  // 8C. HÀM TOGGLE THÔNG MINH (Dành cho nút bấm Trái tim ở các trang khác)
  // - Nếu đang yêu thích (isFavorite = true) -> Gọi XÓA (DELETE)
  // - Nếu chưa yêu thích (isFavorite = false) -> Gọi THÊM (POST)
  toggleFavorite: async (
    hotelId,
    isFavorite = false,
    favoriteRecordId = null,
  ) => {
    if (isFavorite) {
      return await hotelService.removeFavorite(hotelId, favoriteRecordId);
    } else {
      return await hotelService.addFavorite(hotelId);
    }
  },

  // 9. Lấy danh sách khách sạn đã yêu thích của User (Thêm chống Cache + Bóc tách chuẩn)
  getFavoriteHotels: async () => {
    try {
      const res = await apiClient.get(`/users/favorites?_t=${Date.now()}`);
      const rawList = ensureArray(res, "favorites");

      return rawList.map((item) => {
        if (item.hotel && typeof item.hotel === "object") {
          return {
            ...item.hotel,
            favorite_record_id: item.id,
            id: item.hotel.id || item.hotel_id,
          };
        }

        if (item.hotel_id) {
          return {
            ...item,
            favorite_record_id: item.id,
            id: item.hotel_id,
          };
        }

        return item;
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách yêu thích:", error);
      return [];
    }
  },
};

export default hotelService;
