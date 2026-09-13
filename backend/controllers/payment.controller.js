require("dotenv").config();
const pool = require("../config/database");

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

// 🌟 TẠO BẢNG LƯU LỊCH SỬ QUYẾT TOÁN CHO ADMIN (ĐẢM BẢO DATABASE CÓ DỮ LIỆU NGAY)
pool
  .query(
    `
  CREATE TABLE IF NOT EXISTS public.payout_settlement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    transaction_id TEXT,
    reference_number TEXT,
    raw_content TEXT,
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

// ─── 1. TẠO QR CHO KHÁCH (VỀ ADMIN) ───
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
        .json({ success: false, message: "Không tìm thấy đơn." });

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

// ─── 2. CHECK STATUS CHO KHÁCH (CHECKOUT) ───
async function checkPaymentStatus(req, res) {
  try {
    const code = String(
      req.params.bookingCode || req.query.bookingCode || "",
    ).trim();
    const result = await pool.query(
      `SELECT status, payment_status FROM public.booking WHERE booking_code ILIKE $1 LIMIT 1`,
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
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3. WEBHOOK SEPAY (CHO TIỀN VÀO CỦA KHÁCH) ───
async function handleBankWebhook(req, res) {
  try {
    const body = req.body || {};
    const content = String(body.content || body.description || "");

    const matchBooking = content.match(/BK\s*\d{6,12}/i);
    if (matchBooking) {
      const bookingCode = matchBooking[0].replace(/\s+/g, "").toUpperCase();
      await pool.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', status = 'confirmed', confirmed_at = NOW()
         WHERE booking_code ILIKE $1`,
        [`%${bookingCode}%`],
      );
      console.log(`✅ [Khách Trả Phòng]: Đã duyệt đơn ${bookingCode}`);
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. 🌟 ĐỐI SOÁT TRỰC TIẾP SEPAY API (BẮT ĐÚNG GIAO DỊCH -4.920 Đ TRÊN ẢNH) ───
async function checkPayoutStatus(req, res) {
  try {
    const rawHotelId = String(
      req.params.hotelId || req.query.hotelId || "",
    ).trim();
    const cleanHotelId = rawHotelId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    console.log(
      `📡 [Admin Polling]: Đang tra cứu SePay cho khách sạn #${cleanHotelId}...`,
    );

    if (!cleanHotelId) {
      return res.status(400).json({ success: false, message: "Thiếu hotelId" });
    }

    // 1. Kiểm tra xem Database đã ghi nhận chưa
    const checkDb = await pool.query(
      `SELECT * FROM public.payout_settlement 
       WHERE REPLACE(hotel_id::text, '-', '') ILIKE $1 
         AND created_at >= NOW() - INTERVAL '30 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [cleanHotelId],
    );

    if (checkDb.rows.length > 0) {
      console.log(
        `🎉 [Database Hit]: Đã có lịch sử quyết toán cho #${cleanHotelId}`,
      );
      return res.json({ success: true, settled: true, is_settled: true });
    }

    // 2. Gọi thẳng SePay API đọc danh sách giao dịch gần nhất
    if (!SEPAY_API_KEY) {
      console.error("❌ CHƯA CÓ SEPAY_API_KEY TRONG FILE .ENV!");
      return res.json({ success: true, settled: false });
    }

    try {
      const sepayRes = await fetch(
        "https://my.sepay.vn/userapi/transactions/list?limit=20",
        {
          headers: {
            Authorization: `Apikey ${SEPAY_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!sepayRes.ok) {
        console.error(`❌ Lỗi gọi SePay API: HTTP ${sepayRes.status}`);
        return res.json({ success: true, settled: false });
      }

      const sepayData = await sepayRes.json();
      const transactions = sepayData?.transactions || [];

      // 🌟 TÌM KIẾM CHÍNH XÁC DÒNG CÓ CHỮ PAYOUT + MÃ KHÁCH SẠN
      const matched = transactions.find((tx) => {
        const rawContent = String(
          tx.transaction_content || tx.content || tx.description || "",
        ).toLowerCase();
        const cleanContent = rawContent.replace(/[^a-zA-Z0-9]/g, "");

        const amountOut = Math.abs(
          Number(tx.amount_out || tx.transferAmount || 0),
        );

        // Kiểm tra xem nội dung có chứa chữ "payout" VÀ chứa mã khách sạn không
        const isPayoutMemo =
          cleanContent.includes("payout") &&
          cleanContent.includes(cleanHotelId.substring(0, 8));

        return amountOut > 0 && isPayoutMemo;
      });

      if (matched) {
        console.log(
          `🎉 [SEPAY KHỚP THÀNH CÔNG]: Tìm thấy giao dịch -${matched.amount_out}đ cho KS #${cleanHotelId}!`,
        );

        // LƯU NGAY VÀO DATABASE ĐỂ BẠN KIỂM TRA ĐƯỢC
        await pool.query(
          `INSERT INTO public.payout_settlement (hotel_id, amount, transaction_id, reference_number, raw_content)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            rawHotelId,
            Math.abs(Number(matched.amount_out || 0)),
            String(matched.id),
            matched.reference_number || `FT_${matched.id}`,
            JSON.stringify(matched),
          ],
        );

        return res.json({ success: true, settled: true, is_settled: true });
      } else {
        console.log(
          `⏳ Đang chờ giao dịch trừ tiền trên SePay... (Đã kiểm tra ${transactions.length} giao dịch gần nhất)`,
        );
      }
    } catch (apiErr) {
      console.error("❌ Lỗi fetch SePay:", apiErr.message);
    }

    return res.json({ success: true, settled: false, is_settled: false });
  } catch (err) {
    console.error("❌ Lỗi checkPayoutStatus:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createVietQrPayment,
  checkPaymentStatus,
  handleBankWebhook,
  checkPayoutStatus,
  confirmManualPayment: (req, res) => res.json({ success: true }),
};
