import { useState, useEffect, useCallback, useMemo } from "react";
import roomService from "@/services/roomService"; // Giả sử bạn có service này
import { differenceInDays, isBefore, startOfDay } from "date-fns";

export const useRoomAvailability = (hotelId, startDate, endDate) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Tính số đêm (Derived State)
  const numberOfNights = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const nights = differenceInDays(new Date(endDate), new Date(startDate));
    return nights > 0 ? nights : 0;
  }, [startDate, endDate]);

  // 2. Hàm gọi API kiểm tra phòng trống
  const checkAvailability = useCallback(async () => {
    // Chỉ gọi API khi có đủ ngày nhận và ngày trả
    if (!hotelId || !startDate || !endDate) return;

    // Kiểm tra logic ngày (Ngày nhận phải trước ngày trả)
    if (isBefore(new Date(endDate), new Date(startDate))) {
      setError("Ngày trả phòng phải sau ngày nhận phòng");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /**
       * Gọi API: GET /api/hotels/:id/availability?checkIn=...&checkOut=...
       * API này sẽ trả về danh sách các loại phòng kèm:
       * - stock: Số lượng phòng thực tế còn trống trong khoảng ngày đó
       * - current_price: Giá đã được tính toán (giá lễ tết, cuối tuần...)
       */
      const data = await roomService.checkAvailability({
        hotelId,
        checkIn: startDate.toISOString(),
        checkOut: endDate.toISOString(),
      });

      setRooms(data || []);
    } catch (err) {
      const errMsg =
        err.response?.data?.message || "Lỗi kiểm tra tình trạng phòng";
      setError(errMsg);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [hotelId, startDate, endDate]);

  // 3. Tự động gọi lại khi ngày tháng thay đổi
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // 4. Các hàm hỗ trợ tính toán tiền cho UI
  const calculateTotal = useCallback(
    (selectedRooms = []) => {
      // selectedRooms dạng: [{ roomId: 1, quantity: 2 }, ...]
      return selectedRooms.reduce((total, selection) => {
        const roomInfo = rooms.find((r) => r.id === selection.roomId);
        const price = roomInfo?.sell_price || 0;
        return total + price * selection.quantity * numberOfNights;
      }, 0);
    },
    [rooms, numberOfNights],
  );

  return {
    rooms, // Danh sách phòng khả dụng cho khoảng ngày đã chọn
    loading,
    error,
    numberOfNights, // Để hiển thị: "Giá cho 3 đêm"
    calculateTotal, // Hàm tính tổng tiền dựa trên lựa chọn của khách
    refresh: checkAvailability,
  };
};

export default useRoomAvailability;
