/**
 * 1. VAI TRÒ NGƯỜI DÙNG (ROLES)
 */
export const ROLES = Object.freeze({
  ADMIN: "admin",
  OWNER: "owner",
  CUSTOMER: "customer",
  GUEST: "guest",
});

/**
 * 2. TRẠNG THÁI ĐƠN ĐẶT PHÒNG (BOOKING STATUS)
 */
export const BOOKING_STATUS = Object.freeze({
  PENDING: "pending", // Chờ chủ nhà duyệt / Chờ thanh toán
  CONFIRMED: "confirmed", // Đã xác nhận
  CHECKED_IN: "checked_in", // Khách đang ở trong khách sạn
  CHECKED_OUT: "checked_out", // Khách đã trả phòng (Hoàn tất)
  CANCELLED: "cancelled", // Đơn đã bị hủy
});

/**
 * 3. TRẠNG THÁI THANH TOÁN (PAYMENT STATUS)
 */
export const PAYMENT_STATUS = Object.freeze({
  UNPAID: "unpaid", // Chưa thanh toán
  PENDING: "pending", // Đang xử lý giao dịch
  PAID: "paid", // Đã thanh toán thành công
  PARTIALLY_PAID: "partially_paid", // Đặt cọc / Thanh toán 1 phần
  REFUNDED: "refunded", // Đã hoàn tiền lại cho khách
  FAILED: "failed", // Giao dịch thanh toán thất bại
  CANCELLED: "cancelled", // Giao dịch bị hủy
});

/**
 * 4. PHƯƠNG THỨC THANH TOÁN (PAYMENT METHODS)
 */
export const PAYMENT_METHODS = Object.freeze({
  VNPAY: "vnpay",
  MOMO: "momo",
  CREDIT_CARD: "card",
  BANK_TRANSFER: "transfer",
  PAY_AT_HOTEL: "at_hotel",
});

/**
 * 5. TRẠNG THÁI SỐ PHÒNG VẬT LÝ & VỆ SINH (ROOM STATUS)
 */
export const ROOM_STATUS = Object.freeze({
  AVAILABLE: "available", // Phòng trống sẵn sàng đón khách
  OCCUPIED: "occupied", // Đang có khách ở
  RESERVED: "reserved", // Khách đã đặt, sắp nhận phòng
  MAINTENANCE: "maintenance", // Đang khóa / Bảo trì
});

export const CLEAN_STATUS = Object.freeze({
  CLEAN: "clean", // Đã dọn dẹp sạch sẽ
  DIRTY: "dirty", // Chưa dọn dẹp
});

/**
 * 6. LOẠI HÌNH CHỖ NGHỈ (HOTEL TYPES)
 */
export const PROPERTY_TYPES = Object.freeze({
  HOTEL: "Khách sạn",
  RESORT: "Resort",
  HOMESTAY: "Homestay",
  VILLA: "Biệt thự",
  APARTMENT: "Căn hộ",
});

/**
 * 7. NHÃN & MÀU SẮC HIỂN THỊ TRÊN GIAO DIỆN (UI BADGE HELPERS)
 */
export const BOOKING_STATUS_CONFIG = Object.freeze({
  [BOOKING_STATUS.PENDING]: {
    label: "Chờ xác nhận",
    variant: "warning",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    label: "Đã xác nhận",
    variant: "primary",
    color: "bg-blue-50 text-[#006ce4] border-blue-200",
  },
  [BOOKING_STATUS.CHECKED_IN]: {
    label: "Đang lưu trú",
    variant: "success",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  [BOOKING_STATUS.CHECKED_OUT]: {
    label: "Đã trả phòng",
    variant: "default",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  [BOOKING_STATUS.CANCELLED]: {
    label: "Đã hủy",
    variant: "danger",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
});
