import apiClient from "./apiClient";

const roomService = {
  // 1. Lấy danh sách phòng trống và giá thực tế (Table 7 & 9)
  // Query này sẽ kết hợp bảng Room và Room_Inventory để trả về giá theo ngày khách chọn
  getAvailableRooms: async (hotelId, params) => {
    // params: { checkIn, checkOut, adults }
    const response = await apiClient.get(
      `/hotels/${hotelId}/rooms/availability`,
      {
        params,
      },
    );
    return response.data;
  },

  // 2. Lấy chi tiết một loại phòng cụ thể (Table 7)
  getRoomDetail: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data;
  },

  // 3. Lấy tiện ích của phòng (Table 13: room_amenity)
  getRoomAmenities: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/amenities`);
    return response.data;
  },

  // 4. Cập nhật tồn kho (Dành cho Owner - Table 9)
  updateInventory: async (roomId, inventoryData) => {
    const response = await apiClient.put(
      `/rooms/${roomId}/inventory`,
      inventoryData,
    );
    return response.data;
  },
};

// QUAN TRỌNG: Phải có dòng này để sửa lỗi "does not provide an export named 'default'"
export default roomService;
