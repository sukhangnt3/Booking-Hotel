import { z } from "zod";

// Regex kiểm tra số điện thoại Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09)
const vietnamPhoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

// ─── 1. SCHEMA ĐĂNG NHẬP (LOGIN) ───
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập địa chỉ email")
    .email("Định dạng email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

// ─── 2. SCHEMA ĐĂNG KÝ (REGISTER) ───
export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự"),
    email: z
      .string()
      .min(1, "Vui lòng nhập địa chỉ email")
      .email("Định dạng email không hợp lệ"),
    phone: z
      .string()
      .regex(vietnamPhoneRegex, "Số điện thoại Việt Nam không hợp lệ"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận lại mật khẩu"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp",
    path: ["confirmPassword"], // Báo lỗi tại ô confirmPassword
  });

// ─── 3. SCHEMA ĐIỀN THÔNG TIN ĐẶT PHÒNG (BOOKING / GUEST FORM) ───
export const bookingGuestSchema = z.object({
  fullName: z.string().min(2, "Vui lòng nhập đầy đủ họ tên người đặt"),
  email: z
    .string()
    .min(1, "Vui lòng nhập email để nhận vé điện tử")
    .email("Địa chỉ email không hợp lệ"),
  phone: z
    .string()
    .regex(vietnamPhoneRegex, "Vui lòng nhập số điện thoại hợp lệ để liên hệ"),
  specialRequest: z
    .string()
    .max(500, "Yêu cầu đặc biệt không vượt quá 500 ký tự")
    .optional(),
});

// ─── 4. SCHEMA TẠO / SỬA KHÁCH SẠN (HOTEL FORM) ───
export const hotelFormSchema = z.object({
  name: z.string().min(3, "Tên khách sạn phải có ít nhất 3 ký tự"),
  type: z.string().min(1, "Vui lòng chọn loại hình chỗ nghỉ"),
  phone: z.string().min(8, "Số điện thoại lễ tân không hợp lệ"),
  city: z.string().min(2, "Vui lòng nhập tỉnh / thành phố"),
  address: z.string().min(5, "Địa chỉ chi tiết phải có ít nhất 5 ký tự"),
  description: z
    .string()
    .min(10, "Mô tả chỗ nghỉ nên có ít nhất 10 ký tự")
    .optional(),
  start_checkin_time: z.string().min(1, "Vui lòng chọn giờ Check-in"),
  start_checkout_time: z.string().min(1, "Vui lòng chọn giờ Check-out"),
  cancellation_policy: z.string().optional(),
  animal_allowed: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  images: z
    .array(z.string())
    .min(1, "Vui lòng tải lên ít nhất 1 hình ảnh của chỗ nghỉ"),
});

// ─── 5. SCHEMA TẠO / SỬA LOẠI PHÒNG (ROOM FORM) ───
export const roomFormSchema = z.object({
  name: z.string().min(3, "Tên hạng phòng phải có ít nhất 3 ký tự"),
  sell_price: z.coerce.number().positive("Giá phòng mỗi đêm phải lớn hơn 0"),
  room_count: z.coerce
    .number()
    .int("Số lượng phòng phải là số nguyên")
    .min(1, "Số lượng phòng tối thiểu là 1"),
  capacity: z.coerce.number().int().min(1, "Sức chứa tối thiểu là 1 người lớn"),
  room_area: z.coerce.number().positive("Diện tích phòng phải lớn hơn 0"),
  bed_type: z.string().min(1, "Vui lòng nhập cấu hình giường"),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
});

// ─── 6. SCHEMA GỬI ĐÁNH GIÁ (REVIEW FORM) ───
export const reviewFormSchema = z.object({
  rating: z
    .number()
    .min(1, "Vui lòng chọn số sao đánh giá từ 1 đến 5")
    .max(5, "Số sao tối đa là 5"),
  comment: z
    .string()
    .min(10, "Nội dung đánh giá phải có ít nhất 10 ký tự")
    .max(1000, "Nội dung đánh giá không vượt quá 1000 ký tự"),
});

// ─── 7. SCHEMA TẠO MÃ GIẢM GIÁ (PROMOTION FORM) ───
export const promotionFormSchema = z.object({
  code: z
    .string()
    .min(3, "Mã voucher phải có ít nhất 3 ký tự")
    .max(20, "Mã voucher không vượt quá 20 ký tự")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Mã voucher chỉ gồm chữ in hoa, số và dấu gạch ngang",
    ),
  discount_type: z.enum(["percentage", "amount"], {
    message: "Loại giảm giá không hợp lệ",
  }),
  value: z.coerce.number().positive("Mức giảm giá phải lớn hơn 0"),
  min_spend: z.coerce
    .number()
    .nonnegative("Giá trị đơn tối thiểu không được âm"),
  start_date: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  end_date: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
});
