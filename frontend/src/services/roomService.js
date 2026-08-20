import apiClient from "./apiClient";

export const roomService = {
  // 1. DÀNH CHO KHÁCH HÀNG: KIỂM TRA PHÒNG TRỐNG
  // Kết hợp bảng Room và Room_Inventory để trả về giá/số lượng theo ngày
  checkAvailability: (params) => {
    /**
     * params: { hotelId, checkIn, checkOut, adults, children }
     */
    return apiClient.get(`/hotels/${params.hotelId}/rooms/availability`, {
      params,
    });
  },

  // 2. LẤY DANH SÁCH LOẠI PHÒNG (Cho trang quản lý của Owner hoặc chi tiết KS)
  getByHotelId: (hotelId) => apiClient.get(`/hotels/${hotelId}/rooms`),

  getById: (roomId) => apiClient.get(`/rooms/${roomId}`),

  // 3. QUẢN LÝ TIỆN ÍCH PHÒNG
  getAmenities: (roomId) => apiClient.get(`/rooms/${roomId}/amenities`),

  // 4. DÀNH CHO OWNER: QUẢN LÝ KHO PHÒNG (INVENTORY)
  // Lấy dữ liệu cho component RoomAvailabilityCalendar
  getInventory: (hotelId, params) => {
    /**
     * params: { month, year }
     */
    return apiClient.get(`/hotels/${hotelId}/inventory`, { params });
  },

  // Cập nhật giá hoặc số lượng phòng cho một hoặc nhiều ngày
  updateInventory: (roomId, data) => {
    /**
     * data: { date, sell_price, stock, status }
     */
    return apiClient.put(`/rooms/${roomId}/inventory`, data);
  },

  // 5. QUẢN LÝ SƠ ĐỒ SỐ PHÒNG (ROOM NUMBERS -🔑)
  // Ví dụ: Loại phòng "Deluxe" có các phòng số 101, 102, 103
  getRoomNumbers: (roomId) => apiClient.get(`/rooms/${roomId}/numbers`),

  createRoomNumbers: (roomId, numbers) => {
    /**
     * numbers: ["101", "102", "103"]
     */
    return apiClient.post(`/rooms/${roomId}/numbers`, { numbers });
  },

  updateRoomNumberStatus: (numberId, status) => {
    return apiClient.patch(`/room-numbers/${numberId}/status`, { status });
  },

  // 6. CRUD LOẠI PHÒNG (OWNER)
  create: (hotelId, data) => apiClient.post(`/hotels/${hotelId}/rooms`, data),

  update: (roomId, data) => apiClient.put(`/rooms/${roomId}`, data),

  delete: (roomId) => apiClient.delete(`/rooms/${roomId}`),

  // Upload ảnh riêng cho từng loại phòng
  uploadImages: (roomId, formData) =>
    apiClient.post(`/rooms/${roomId}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export default roomService;
