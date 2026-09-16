// backend/controllers/payment.controller.js
require("dotenv").config();
const pool = require("../config/database");

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

// ─── 3. WEBHOOK SEPAY: XÓA SỐ PHÒNG CŨ ĐỂ ÉP VÀO HÀNG CHỜ LỄ TÂN DUYỆT ───
// backend/controllers/payment.controller.js
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
    const transferAmount = Number(body.transferAmount || body.amount || 0);

    console.log("🔔 [SEPAY NHẬN TIỀN THẬT]:", { content, transferAmount });

    let matchedBooking = null;

    // 🌟 ƯU TIÊN 1: CHỈ TÌM ĐÍCH DANH MÃ BẮT ĐẦU BẰNG BK HOẶC DP (KHÔNG BẮT SỐ NGÂN HÀNG)
    const matchSpecific = content.match(/(BK\s*\d+|DP\s*\d+)/i);
    if (matchSpecific) {
      const cleanCode = matchSpecific[0].replace(/\s+/g, "").toUpperCase();
      console.log(`🔎 Tìm thấy mã đơn chính xác: ${cleanCode}`);

      const bRes = await pool.query(
        `SELECT id, booking_code, hotel_id, total_price FROM public.booking 
         WHERE booking_code ILIKE $1 LIMIT 1`,
        [cleanCode],
      );
      if (bRes.rows.length > 0) {
        matchedBooking = bRes.rows[0];
      }
    }

    // 🌟 ƯU TIÊN 2 (DỰ PHÒNG): Quét ngược toàn bộ mã đơn đang chờ trong Database xem mã nào xuất hiện trong tin nhắn
    if (!matchedBooking) {
      console.log(
        "⚠️ Đang quét đối chiếu ngược với các đơn chưa thanh toán trong CSDL...",
      );
      const pendingRes = await pool.query(
        `SELECT id, booking_code, hotel_id, total_price FROM public.booking 
         WHERE (payment_status IS NULL OR payment_status != 'paid')
           AND status NOT IN ('cancelled', 'checked_out')
         ORDER BY created_at DESC 
         LIMIT 20`,
      );

      const normalizedContent = content
        .replace(/[^A-Z0-9]/gi, "")
        .toUpperCase();

      for (const b of pendingRes.rows) {
        const cleanBookingCode = b.booking_code
          .replace(/[^A-Z0-9]/gi, "")
          .toUpperCase();
        if (normalizedContent.includes(cleanBookingCode)) {
          matchedBooking = b;
          console.log(
            `🎯 Khớp thành công mã đơn [${b.booking_code}] từ nội dung chuyển tiền!`,
          );
          break;
        }
      }
    }

    // NẾU TÌM THẤY ĐƠN: ĐẨY NGAY VÀO "CHỜ LỄ TÂN XÁC NHẬN"
    if (matchedBooking) {
      await pool.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', 
             status = 'pending'::public.booking_status_enum,
             receptionist_assigned = false,
             room_number = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [matchedBooking.id],
      );

      await pool
        .query(
          `UPDATE public.payment 
         SET status = 'paid', 
             paid_amount = $1, 
             paid_at = NOW(), 
             updated_at = NOW() 
         WHERE booking_id = $2`,
          [transferAmount || matchedBooking.total_price, matchedBooking.id],
        )
        .catch(() => {});

      console.log(
        `✅ [THÀNH CÔNG]: Đơn ${matchedBooking.booking_code} đã xuất hiện ở nút "Chờ xác nhận" của Lễ tân!`,
      );
    } else {
      console.warn(
        `❌ [CẢNH BÁO]: Không tìm thấy đơn phòng nào khớp với nội dung: "${content}"`,
      );
    }

    return res.json({ success: true, matched: Boolean(matchedBooking) });
  } catch (error) {
    console.error("❌ Lỗi SePay Webhook:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. DUYỆT THỦ CÔNG ───
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
           receptionist_assigned = false,
           room_number = NULL,
           updated_at = NOW()
       WHERE booking_code ILIKE $1 OR id::text = $1
       RETURNING *`,
      [raw],
    );

    return res.json({ success: true, booking: updateRes.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 5. ADMIN QUYẾT TOÁN ───
async function confirmManualPayout(req, res) {
  try {
    const { hotelId, hotel_id, amount } = req.body || {};
    const targetHotelId = String(hotelId || hotel_id || "").trim();

    if (!targetHotelId) {
      return res.status(400).json({ success: false, message: "Thiếu hotelId" });
    }

    await pool.query(
      `INSERT INTO public.payout_settlement (hotel_id, amount) VALUES ($1, $2)`,
      [targetHotelId, Number(amount || 0)],
    );

    return res.json({
      success: true,
      settled: true,
      message: `Đã xác nhận quyết toán thành công cho khách sạn #${targetHotelId}!`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function checkPayoutStatus(req, res) {
  return res.json({ success: true, settled: false });
}

module.exports = {
  createVietQrPayment,
  checkPaymentStatus,
  handleBankWebhook,
  confirmManualPayment,
  confirmManualPayout,
  checkPayoutStatus,
};
