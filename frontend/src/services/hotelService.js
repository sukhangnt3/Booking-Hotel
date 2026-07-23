import apiClient from './apiClient';

export const hotelService = {
  // 1. API gợi ý địa điểm khi gõ ở thanh tìm kiếm (API nhỏ)
  searchDestinations: async (keyword) => {
    return await apiClient.get('/hotels/destinations', {
      params: { q: keyword }
    });
  },

  // 2. API lấy danh sách khách sạn theo bộ lọc (API chính)
  searchHotels: async (filters) => {
    return await apiClient.get('/hotels/search', {
      params: filters // { destination, checkIn, checkOut, adults, children, rooms }
    });
  }
};

export default hotelService;