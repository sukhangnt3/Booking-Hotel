import { useState, useEffect, useCallback } from "react";
import hotelService from "@/services/hotelService";

export const useHotelDetail = (hotelId) => {
  // 1. STATE QUẢN LÝ
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. HÀM GỌI API CHI TIẾT
  const fetchHotelDetail = useCallback(async () => {
    if (!hotelId) return;

    setLoading(true);
    setError(null);
    try {
      // Gọi song song hoặc gọi gộp tùy Backend (Ví dụ gọi gộp tất cả trong 1 API detail)
      const response = await hotelService.getById(hotelId);

      /**
       * Giả sử cấu trúc API trả về:
       * {
       *    ...thông tin khách sạn,
       *    policy: {...},
       *    amenities: [...],
       *    images: [...],
       *    rooms: [...]
       * }
       */
      setHotel(response);
      setRooms(response.rooms || []);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Không thể tải thông tin khách sạn";
      setError(errMsg);
      console.error("[useHotelDetail] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  // 3. EFFECT: Tự động gọi khi hotelId thay đổi
  useEffect(() => {
    fetchHotelDetail();
  }, [fetchHotelDetail]);

  // 4. CÁC HÀM TIỆN ÍCH (HELPER ACTIONS)

  // Hàm tính toán giá thấp nhất trong các phòng (Derived State)
  const getMinPrice = useCallback(() => {
    if (!rooms.length) return 0;
    return Math.min(...rooms.map((room) => room.sell_price || Infinity));
  }, [rooms]);

  return {
    hotel,
    rooms,
    loading,
    error,
    minPrice: getMinPrice(),
    refresh: fetchHotelDetail, // Để dùng cho tính năng "Pull to refresh"
  };
};

export default useHotelDetail;
