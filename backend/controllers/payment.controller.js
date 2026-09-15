// backend/controllers/payment.controller.js
require("dotenv").config();
const pool = require("../config/database");

// TỰ ĐỘNG TẠO BẢNG LƯU LỊCH SỬ QUYẾT TOÁN CỦA ADMIN
pool
  .query(
    `
  CREATE TABLE IF NOT EXISTS public.payout_settlement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
`,
  )
  .catch((err) => console.error("Lỗi init payout_settlement:", err.message));

// TÀI KHOẢN NGÂN HÀNG CỦA ADMIN (SEPAY THU TIỀN CỦA KHÁCH)
const DEFAULT_PLATFORM_BANK = {
  bankId: "MB",
  bankBin: "970422",
  bankName: "MB Bank",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

// ─── 1. TẠO QR THANH TOÁN PHÒNG CHO KHÁCH (VỀ TÀI KHOẢN ADMIN) ───
async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount } = req.body || {};
    const code = String(bookingCode || req.body.booking_code || "").trim();

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price FROM public.booking WHERE booking_code ILIKE $1 OR id::text = $1 LIMIT 1`,
      [code],
    );

    const booking = bookingResult.rows[0];
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });

    const expectedAmount = Math.round(
      Number(amount || booking.total_price || 0),
    );
    const qrCodeUrl = `https://qr.sepay.vn/img?acc=${DEFAULT_PLATFORM_BANK.accountNumber}&bank=${DEFAULT_PLATFORM_BANK.bankId}&amount=${expectedAmount}&des=${encodeURIComponent(booking.booking_code)}`;

    return res.json({
      success: true,
      bookingCode: booking.booking_code,
      expectedAmount,
      bankInfo: DEFAULT_PLATFORM_BANK,
      qrCodeUrl,
      qr_code: qrCodeUrl,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. CHECK STATUS CHO KHÁCH TẠI TRANG CHECKOUT (POLLING) ───
async function checkPaymentStatus(req, res) {
  try {
    const code = String(
      req.params.bookingCode || req.query.bookingCode || "",
    ).trim();
    const result = await pool.query(
      `SELECT status, payment_status, room_number FROM public.booking WHERE booking_code ILIKE $1 OR id::text = $1 LIMIT 1`,
      [code],
    );

    if (result.rows.length === 0)
      return res.json({ success: true, paid: false });

    const isPaid =
      String(result.rows[0].payment_status).toLowerCase() === "paid" ||
      String(result.rows[0].status).toLowerCase() === "confirmed";

    return res.json({
      success: true,
      paid: isPaid,
      status: isPaid ? "paid" : "pending",
      payment_status: result.rows[0].payment_status,
      booking_status: result.rows[0].status,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3. WEBHOOK SEPAY TỰ ĐỘNG BẮT TIỀN KHÁCH ĐẶT PHÒNG 24/7 ───
async function handleBankWebhook(req, res) {
  try {
    const body = req.body || {};
    const content = String(
      body.content ||
        body.description ||
        body.code ||
        body.bookingCode ||
        body.booking_code ||
        "",
    );

    console.log("🔔 [SePay Webhook Received]:", {
      content,
      transferAmount: body.transferAmount,
    });

    const matchBooking = content.match(/(DP\s*\d+|BK\s*\d+|[A-Z0-9]{6,15})/i);

    if (matchBooking) {
      const bookingCode = matchBooking[0].replace(/\s+/g, "").toUpperCase();

      // Đánh dấu thanh toán thành công, giữ room_number = NULL và confirmed_at = NULL để Lễ tân chọn phòng
      const updateResult = await pool.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', 
             status = 'pending'::public.booking_status_enum,
             room_number = NULL,
             confirmed_at = NULL,
             updated_at = NOW()
         WHERE booking_code ILIKE $1 OR booking_code ILIKE $2
         RETURNING id, booking_code, hotel_id`,
        [bookingCode, `%${bookingCode}%`],
      );

      if (updateResult.rows.length > 0) {
        console.log(
          `✅ [SePay Khách Thanh Toán]: Đã nhận tiền đơn ${bookingCode}. Đơn đã sẵn sàng trên màn hình Lễ tân!`,
        );
      } else {
        console.warn(
          `⚠️ [SePay]: Không tìm thấy đơn nào trong DB khớp mã ${bookingCode}`,
        );
      }
    } else {
      console.warn(
        "⚠️ [SePay]: Không trích xuất được mã đơn từ nội dung:",
        content,
      );
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("❌ Lỗi SePay Webhook:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3.1. HÀM XÁC NHẬN THANH TOÁN (KHI BẤM NÚT TRÊN WEB HOẶC TEST) ───
async function confirmManualPayment(req, res) {
  try {
    const { booking_code, bookingCode, code } = req.body || {};
    const raw = String(booking_code || bookingCode || code || "").trim();

    if (!raw) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn" });
    }

    const updateRes = await pool.query(
      `UPDATE public.booking 
       SET payment_status = 'paid', 
           status = 'pending'::public.booking_status_enum,
           room_number = NULL,
           confirmed_at = NULL,
           updated_at = NOW()
       WHERE booking_code ILIKE $1 OR id::text = $1
       RETURNING *`,
      [raw],
    );

    if (updateRes.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    console.log(
      `✅ [Manual Payment]: Đã duyệt thanh toán đơn ${raw} sang Chờ Lễ Tân chọn phòng!`,
    );
    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (err) {
    console.error("❌ Lỗi confirmManualPayment:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 4. ADMIN BẤM XÁC NHẬN ĐÃ CHUYỂN TIỀN CHO OWNER: GHI DATABASE NGAY ───
async function confirmManualPayout(req, res) {
  try {
    const { hotelId, hotel_id, amount } = req.body || {};
    const targetHotelId = String(hotelId || hotel_id || "").trim();

    console.log(
      `💸 [Admin Payout]: Nhận lệnh quyết toán cho KS #${targetHotelId} - Số tiền: ${amount}đ`,
    );

    if (!targetHotelId) {
      return res.status(400).json({ success: false, message: "Thiếu hotelId" });
    }

    await pool.query(
      `INSERT INTO public.payout_settlement (hotel_id, amount) VALUES ($1, $2)`,
      [targetHotelId, Number(amount || 0)],
    );

    try {
      await pool.query(
        `UPDATE public.booking
         SET payout_status = 'settled', payout_at = NOW()
         WHERE hotel_id::text = $1::text AND payment_status = 'paid'`,
        [targetHotelId],
      );
    } catch (e) {
      console.warn("⚠️ Bỏ qua cập nhật booking:", e.message);
    }

    console.log(
      `✅ [Admin Payout]: Quyết toán thành công cho KS #${targetHotelId}!`,
    );

    return res.json({
      success: true,
      settled: true,
      message: `Đã xác nhận quyết toán thành công cho khách sạn #${targetHotelId}!`,
    });
  } catch (err) {
    console.error("❌ Lỗi confirmManualPayout:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 5. HÀM CHECK STATUS DỰ PHÒNG (ĐẢM BẢO KHÔNG BAO GIỜ BỊ UNDEFINED) ───
async function checkPayoutStatus(req, res) {
  try {
    const hotelId = String(
      req.params.hotelId || req.query.hotelId || "",
    ).trim();
    const check = await pool.query(
      `SELECT id FROM public.payout_settlement WHERE hotel_id::text = $1::text LIMIT 1`,
      [hotelId],
    );
    const isSettled = check.rows.length > 0;
    return res.json({
      success: true,
      settled: isSettled,
      is_settled: isSettled,
    });
  } catch (err) {
    return res.json({ success: true, settled: false });
  }
}

module.exports = {
  createVietQrPayment,
  checkPaymentStatus,
  handleBankWebhook,
  confirmManualPayment,
  confirmManualPayout,
  checkPayoutStatus,
};
