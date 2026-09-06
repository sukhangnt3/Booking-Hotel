// src/services/roomService.js
import apiClient from "./apiClient";

export const roomService = {
  // 1. Kiểm tra phòng trống theo khoảng ngày nhận & trả (Realtime Overbooking Check)
  checkAvailability: (params) => {
    const hotelId = params.hotelId || params.hotel_id;
    return apiClient.get(`/hotels/${hotelId}/availability`, {
      params: {
        checkIn: params.checkIn || params.checkin_date,
        checkOut: params.checkOut || params.checkout_date,
        adults: params.adults,
      },
    });
  },

  // 2. Lấy danh sách loại phòng của khách sạn
  getByHotelId: (hotelId) => apiClient.get(`/hotels/${hotelId}/rooms`),
  getById: (roomId) => apiClient.get(`/rooms/${roomId}`),

  // 3. Tiện nghi phòng
  getAmenities: (roomId) => apiClient.get(`/rooms/${roomId}/amenities`),

  // 4. Lịch tồn kho theo tháng (Bảng 7: room_inventory)
  getInventory: (roomId, params) =>
    apiClient.get(`/rooms/${roomId}/inventory`, { params }),
  updateInventory: (roomId, data) =>
    apiClient.patch(`/rooms/${roomId}/inventory`, data),

  // 5. Thao tác CRUD phòng của Owner
  create: (hotelId, data) =>
    apiClient.post("/rooms", { ...data, hotel_id: hotelId }),
  update: (roomId, data) => apiClient.put(`/rooms/${roomId}`, data),
  delete: (roomId) => apiClient.delete(`/rooms/${roomId}`),
};

export default roomService;
