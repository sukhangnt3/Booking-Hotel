import apiClient from "./apiClient";

export const hotelService = {
  // 1. API gợi ý địa điểm (dùng cho thanh tìm kiếm)
  searchDestinations: async (keyword) => {
    const response = await apiClient.get("/hotels/destinations", {
      params: { q: keyword },
    });
    return response.data; // Trả về mảng dữ liệu để HomePage nhận được
  },

  // 2. API lấy danh sách khách sạn (Dùng cho trang HotelListPage)
  searchHotels: async (filters) => {
    const response = await apiClient.get("/hotels/search", {
      params: filters,
    });
    return response.data;
  },

  // ─── CÁC API BỔ SUNG CHO TRANG CHỦ (HOMEPAGE) ───

  // 3. Lấy loại chỗ nghỉ (Khách sạn, Căn hộ, Resort...)
  getPropertyTypes: async () => {
    const response = await apiClient.get("/hotels/property-types");
    return response.data;
  },

  // 4. Lấy điểm đến thịnh hành
  getTrendingDestinations: async () => {
    const response = await apiClient.get("/hotels/trending-destinations");
    return response.data;
  },

  // 5. Lấy danh sách khám phá Việt Nam
  getDiscoverVietnam: async () => {
    const response = await apiClient.get("/hotels/discover-vietnam");
    return response.data;
  },

  // 6. Lấy danh sách chỗ nghỉ độc đáo
  getUniqueStays: async () => {
    const response = await apiClient.get("/hotels/unique-stays");
    return response.data;
  },
};

export default hotelService;
