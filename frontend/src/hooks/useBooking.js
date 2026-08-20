import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import bookingService from "@/services/bookingService";

export const useBooking = () => {
  const navigate = useNavigate();

  // State cho quá trình tạo đơn hàng (Mutation)
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // State cho quá trình lấy chi tiết đơn hàng (Query)
  const [bookingDetail, setBookingDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // --- 1. HÀM TẠO ĐƠN ĐẶT PHÒNG ---
  const createBooking = async (bookingData) => {
    /**
     * bookingData bao gồm:
     * { hotelId, rooms: [{id, quantity}], checkIn, checkOut, guestInfo, paymentMethod, promoCode }
     */
    setIsCreating(true);
    setCreateError(null);

    try {
      const response = await bookingService.create(bookingData);

      // Giả sử Backend trả về: { bookingId: "BK123", paymentUrl: "https://vnpay.vn/..." }
      const { bookingId, paymentUrl } = response;

      // Nếu có Link thanh toán (VNPay/Momo), chuyển hướng khách đi thanh toán
      if (paymentUrl) {
        window.location.href = paymentUrl;
        return;
      }

      // Nếu không (thanh toán tại chỗ), chuyển về trang thành công
      navigate(`/booking/success/${bookingId}`);
      return response;
    } catch (err) {
      const msg =
        err.response?.data?.message || "Đặt phòng thất bại, vui lòng thử lại.";
      setCreateError(msg);
      throw new Error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // --- 2. HÀM LẤY CHI TIẾT ĐƠN HÀNG ---
  const getBookingById = useCallback(async (id) => {
    if (!id) return;

    setIsLoadingDetail(true);
    setDetailError(null);

    try {
      const response = await bookingService.getById(id);
      setBookingDetail(response);
      return response;
    } catch (err) {
      const msg =
        err.response?.data?.message || "Không tìm thấy thông tin đơn hàng.";
      setDetailError(msg);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  // --- 3. HÀM HỦY ĐƠN HÀNG ---
  const cancelBooking = async (id, reason) => {
    try {
      await bookingService.cancel(id, { reason });
      // Cập nhật lại state cục bộ sau khi hủy thành công
      if (bookingDetail && bookingDetail.id === id) {
        setBookingDetail({ ...bookingDetail, status: "cancelled" });
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || "Không thể hủy đơn hàng");
    }
  };

  return {
    // Actions
    createBooking,
    getBookingById,
    cancelBooking,

    // Create State
    isCreating,
    createError,

    // Query State
    bookingDetail,
    isLoadingDetail,
    detailError,
  };
};

export default useBooking;
