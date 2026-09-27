// backend/controllers/payment.controller.js
require("dotenv").config();
const pool = require("../config/database");

// Tự động khởi tạo bảng quyết toán và bảng chống bắn lặp giao dịch (Idempotency)
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.payout_settlement (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hotel_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.processed_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id TEXT UNIQUE NOT NULL,
        booking_code TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.error("Lỗi init bảng thanh toán:", err.message);
  }
})();

const DEFAULT_PLATFORM_BANK = {
  bankId: "MB",
  bankBin: "970422",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

// ─── 1. TẠO QR THANH TOÁN PHÒNG CHO KHÁCH ───
async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount } = req.body || {};
    const code = String(bookingCode || req.body.booking_code || "").trim();

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price, deposit_amount, payment_type 
       FROM public.booking 
       WHERE booking_code ILIKE $1 OR id::text = $1 
       LIMIT 1`,
      [code],
    );

    const booking = bookingResult.rows[0];
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });

    const isDeposit = booking.payment_type === "DEPOSIT_30";
    const defaultAmount = isDeposit
      ? Number(booking.deposit_amount || Math.round(booking.total_price * 0.3))
      : Number(booking.total_price || 0);

    const expectedAmount = Math.round(Number(amount || defaultAmount));

    const qrCodeUrl = `https://qr.sepay.vn/img?acc=${DEFAULT_PLATFORM_BANK.accountNumber}&bank=${DEFAULT_PLATFORM_BANK.bankId}&amount=${expectedAmount}&des=${encodeURIComponent(booking.booking_code)}`;
    const vietQrUrl = `https://img.vietqr.io/image/${DEFAULT_PLATFORM_BANK.bankBin}-${DEFAULT_PLATFORM_BANK.accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${encodeURIComponent(booking.booking_code)}&accountName=${encodeURIComponent(DEFAULT_PLATFORM_BANK.accountName)}`;

    return res.json({
      success: true,
      bookingCode: booking.booking_code,
      expectedAmount,
      bankInfo: DEFAULT_PLATFORM_BANK,
      qrCodeUrl,
      qr_code: qrCodeUrl,
      vietqr_url: vietQrUrl,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. CHECK STATUS CHO KHÁCH TẠI TRANG CHECKOUT ───
async function checkPaymentStatus(req, res) {
  try {
    const code = String(
      req.params.bookingCode || req.query.bookingCode || "",
    ).trim();
    const result = await pool.query(
      `SELECT status, payment_status, room_number, payment_type, deposit_amount, total_price 
       FROM public.booking 
       WHERE booking_code ILIKE $1 OR id::text = $1 
       LIMIT 1`,
      [code],
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, paid: false, status: "pending" });
    }

    const row = result.rows[0];
    const pStatus = String(row.payment_status || "").toLowerCase();
    const bStatus = String(row.status || "").toLowerCase();

    const isPaid =
      pStatus === "paid" ||
      pStatus === "partially_paid" ||
      bStatus === "confirmed" ||
      bStatus === "checked_in";

    return res.json({
      success: true,
      paid: isPaid,
      status: isPaid ? "paid" : "pending",
      payment_status: row.payment_status,
      booking_status: row.status,
      payment_type: row.payment_type,
      deposit_amount: row.deposit_amount,
      total_price: row.total_price,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3. WEBHOOK SEPAY (TỰ ĐỘNG CHUYỂN SANG CONFIRMED ĐỂ ĐẨY VÀO CHỜ XÁC NHẬN) ───
async function handleBankWebhook(req, res) {
  const client = await pool.connect();
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

    const rawTxId =
      body.id || body.referenceCode || body.transaction_id || body.trans_id;
    const txId = rawTxId ? String(rawTxId).trim() : null;

    console.log("🔔 [SEPAY WEBHOOK]:", { txId, content, transferAmount });

    if (txId) {
      const checkTx = await client.query(
        `SELECT id FROM public.processed_transactions WHERE transaction_id = $1 LIMIT 1`,
        [txId],
      );
      if (checkTx.rows.length > 0) {
        console.warn(`⚠️ [BỎ QUA]: Giao dịch ${txId} đã được xử lý trước đó!`);
        client.release();
        return res.json({
          success: true,
          message: "Transaction already processed",
        });
      }
    }

    let matchedBooking = null;

    const matchSpecific = content.match(/(BK\s*\d+|DP\s*\d+)/i);
    if (matchSpecific) {
      const extractedCode = matchSpecific[0].replace(/\s+/g, "").toUpperCase();
      const bRes = await client.query(
        `SELECT id, booking_code, hotel_id, total_price, payment_type, payment_status, status 
         FROM public.booking 
         WHERE booking_code ILIKE $1 LIMIT 1`,
        [extractedCode],
      );
      if (bRes.rows.length > 0) {
        matchedBooking = bRes.rows[0];
      }
    }

    if (!matchedBooking) {
      const pendingRes = await client.query(
        `SELECT id, booking_code, hotel_id, total_price, payment_type, payment_status, status 
         FROM public.booking 
         WHERE (payment_status IS NULL OR payment_status NOT IN ('paid', 'partially_paid'))
           AND status NOT IN ('cancelled', 'checked_out')
         ORDER BY created_at DESC 
         LIMIT 30`,
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
          break;
        }
      }
    }

    if (matchedBooking) {
      await client.query("BEGIN");

      const lockRes = await client.query(
        `SELECT id, total_price, payment_status FROM public.booking WHERE id = $1 FOR UPDATE`,
        [matchedBooking.id],
      );
      const lockedBooking = lockRes.rows[0];

      if (lockedBooking && lockedBooking.payment_status === "paid") {
        await client.query("ROLLBACK");
        client.release();
        return res.json({
          success: true,
          message: "Booking already fully paid",
        });
      }

      const totalP = Number(matchedBooking.total_price || 0);
      const isDeposit = transferAmount > 0 && transferAmount < totalP;
      const payStatus = isDeposit ? "partially_paid" : "paid";

      // Cập nhật trạng thái sang confirmed để đẩy vào danh sách chờ xác nhận
      await client.query(
        `UPDATE public.booking 
         SET payment_status = $2, 
             status = 'confirmed'::public.booking_status_enum,
             receptionist_assigned = false,
             payment_type = $3,
             deposit_amount = $4,
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [
          matchedBooking.id,
          payStatus,
          isDeposit ? "DEPOSIT_30" : "FULL",
          isDeposit ? transferAmount : 0,
        ],
      );

      await client
        .query(
          `UPDATE public.payment 
         SET status = 'paid', 
             paid_amount = $1, 
             paid_at = NOW(), 
             updated_at = NOW() 
         WHERE booking_id = $2`,
          [transferAmount || totalP, matchedBooking.id],
        )
        .catch(() => {});

      if (txId) {
        await client.query(
          `INSERT INTO public.processed_transactions (transaction_id, booking_code, amount, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (transaction_id) DO NOTHING`,
          [txId, matchedBooking.booking_code, transferAmount],
        );
      }

      await client
        .query(`DELETE FROM public.temporary_locks WHERE booking_id = $1`, [
          matchedBooking.id,
        ])
        .catch(() => {});

      await client.query("COMMIT");

      console.log(
        `✅ [SEPAY THÀNH CÔNG]: Đơn ${matchedBooking.booking_code} đã được XÁC NHẬN GIỮ CHỖ! (${isDeposit ? `CỌC ${transferAmount.toLocaleString("vi-VN")} ₫` : "TRẢ ĐỦ 100%"})`,
      );
    }

    client.release();
    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("❌ Lỗi SePay Webhook:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. DUYỆT THỦ CÔNG ───
async function confirmManualPayment(req, res) {
  try {
    const {
      booking_code,
      bookingCode,
      code,
      is_deposit = false,
      deposit_amount,
    } = req.body || {};
    const raw = String(booking_code || bookingCode || code || "").trim();

    if (!raw) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn" });
    }

    const payStatus = Boolean(is_deposit) ? "partially_paid" : "paid";

    const updateRes = await pool.query(
      `UPDATE public.booking 
       SET payment_status = $2, 
           status = 'confirmed'::public.booking_status_enum,
           receptionist_assigned = false,
           payment_type = CASE WHEN $3 THEN 'DEPOSIT_30' ELSE 'FULL' END,
           deposit_amount = COALESCE($4, deposit_amount),
           confirmed_at = NOW(),
           updated_at = NOW()
       WHERE booking_code ILIKE $1 OR id::text = $1
       RETURNING *`,
      [raw, payStatus, Boolean(is_deposit), deposit_amount || null],
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
      `INSERT INTO public.payout_settlement (hotel_id, amount, created_at) VALUES ($1, $2, NOW())`,
      [targetHotelId, Number(amount || 0)],
    );

    return res.json({
      success: true,
      settled: true,
      message: `Đã xác nhận quyết toán thành công cho khách sạn #${targetHotelId}!`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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
