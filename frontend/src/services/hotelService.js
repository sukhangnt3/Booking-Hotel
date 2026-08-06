import apiClient from "./apiClient";

export const hotelService = {
  // 1. Lấy chi tiết khách sạn (Dùng cho HotelDetailPage)
  getHotelById: async (id) => {
    try {
      const response = await apiClient.get(`/hotels/${id}`);
      return response.data; // Trả về thông tin hotel + rooms + images + amenities
    } catch (error) {
      console.error("Error in getHotelById:", error);
      throw error;
    }
  },
  getHotelReviews: async (hotelId) => {
    try {
      const response = await apiClient.get(`/hotels/${hotelId}/reviews`);
      return response.data; // Trả về mảng các review từ DB
    } catch (error) {
      console.error("Lỗi lấy bình luận:", error);
      throw error;
    }
  },
  // 2. Lấy loại chỗ nghỉ (Dùng cho HomePage - FIX LỖI BẠN ĐANG GẶP)
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
};

// Đảm bảo có dòng export default này
export default hotelService;
