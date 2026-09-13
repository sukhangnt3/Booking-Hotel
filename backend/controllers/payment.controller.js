require("dotenv").config();
const pool = require("../config/database");

// Lấy API Token của SePay từ file .env
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

const BANK_MAP = {
  MB: { bin: "970422", code: "MB", name: "MB Bank" },
  MBB: { bin: "970422", code: "MB", name: "MB Bank" },
  MBBANK: { bin: "970422", code: "MB", name: "MB Bank" },
  VCB: { bin: "970436", code: "Vietcombank", name: "Vietcombank" },
  VIETCOMBANK: { bin: "970436", code: "Vietcombank", name: "Vietcombank" },
  TCB: { bin: "970407", code: "Techcombank", name: "Techcombank" },
  TECHCOMBANK: { bin: "970407", code: "Techcombank", name: "Techcombank" },
  BIDV: { bin: "970418", code: "BIDV", name: "BIDV" },
  CTG: { bin: "970415", code: "VietinBank", name: "VietinBank" },
  ICB: { bin: "970415", code: "VietinBank", name: "VietinBank" },
  VIETINBANK: { bin: "970415", code: "VietinBank", name: "VietinBank" },
  ACB: { bin: "970416", code: "ACB", name: "ACB" },
  VPB: { bin: "970432", code: "VPBank", name: "VPBank" },
  VPBANK: { bin: "970432", code: "VPBank", name: "VPBank" },
  TPB: { bin: "970423", code: "TPBank", name: "TPBank" },
  TPBANK: { bin: "970423", code: "TPBank", name: "TPBank" },
  STB: { bin: "970403", code: "Sacombank", name: "Sacombank" },
  SACOMBANK: { bin: "970403", code: "Sacombank", name: "Sacombank" },
  VBA: { bin: "970405", code: "Agribank", name: "Agribank" },
  AGRIBANK: { bin: "970405", code: "Agribank", name: "Agribank" },
};

function normalizeBank(rawInput) {
  const clean = String(rawInput || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  for (const key in BANK_MAP) {
    if (clean.includes(key)) {
      return BANK_MAP[key];
    }
  }
  return { bin: "970422", code: "MB", name: "MB Bank" };
}

// Tài khoản Admin cố định nhận tiền từ khách
const DEFAULT_PLATFORM_BANK = {
  bankId: "MB",
  bankBin: "970422",
  bankName: "MB Bank",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

async function getOwnerBankAccount(hotelId) {
  if (!hotelId) return DEFAULT_PLATFORM_BANK;
  try {
    const res = await pool.query(
      `SELECT bank_code, bank_name, bank_account, bank_account_holder, name
       FROM public.hotel
       WHERE id::text = $1::text
       LIMIT 1`,
      [hotelId],
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      const cleanAcc = String(row.bank_account || "")
        .replace(/\D/g, "")
        .trim();

      if (cleanAcc.length >= 6) {
        const norm = normalizeBank(row.bank_code || row.bank_name);
        return {
          bankId: norm.code,
          bankBin: norm.bin,
          bankName: norm.name,
          accountNumber: cleanAcc,
          accountName: String(
            row.bank_account_holder || row.name || "CHỦ CƠ SỞ",
          )
            .toUpperCase()
            .trim(),
        };
      }
    }
  } catch (err) {
    console.warn("⚠️ getOwnerBankAccount fallback:", err.message);
  }
  return DEFAULT_PLATFORM_BANK;
}

// ─── 1. TẠO QR THANH TOÁN PHÒNG CHO KHÁCH (TIỀN VỀ ADMIN) ───
async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    const code = String(bookingCode || req.body.booking_code || "").trim();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "bookingCode là bắt buộc.",
      });
    }

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price, hotel_id 
       FROM public.booking
       WHERE booking_code ILIKE $1 OR id::text = $1
       LIMIT 1`,
      [code],
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt phòng.",
      });
    }

    const expectedAmount = Math.round(
      Number(amount || booking.total_price || 0),
    );
    const bank = DEFAULT_PLATFORM_BANK;

    const cleanBankCode = encodeURIComponent(bank.bankId);
    const cleanAccNo = encodeURIComponent(bank.accountNumber);
    const cleanDes = encodeURIComponent(booking.booking_code);

    const qrCodeUrl = `https://qr.sepay.vn/img?acc=${cleanAccNo}&bank=${cleanBankCode}&amount=${expectedAmount}&des=${cleanDes}`;

    const checkPayment = await pool.query(
      `SELECT id FROM public.payment WHERE booking_id = $1 LIMIT 1`,
      [booking.id],
    );

    let paymentId;
    if (checkPayment.rows.length > 0) {
      paymentId = checkPayment.rows[0].id;
      await pool.query(
        `UPDATE public.payment 
         SET expected_amount = $1, qr_code = $2, qr_content = $3, updated_at = NOW()
         WHERE id = $4`,
        [expectedAmount, qrCodeUrl, booking.booking_code, paymentId],
      );
    } else {
      const insertPayment = await pool.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, 
          qr_code, qr_content, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, 0, 
          $3, $4, 'pending', NOW(), NOW()
        ) RETURNING id`,
        [booking.id, expectedAmount, qrCodeUrl, booking.booking_code],
      );
      paymentId = insertPayment.rows[0].id;
    }

    return res.json({
      success: true,
      paymentId,
      bookingCode: booking.booking_code,
      expectedAmount,
      paymentType: paymentType || "FULL",
      bankInfo: bank,
      qrCodeUrl,
      qr_code: qrCodeUrl,
      qrContent: booking.booking_code,
      qr_content: booking.booking_code,
    });
  } catch (error) {
    console.error("❌ LỖI CREATE_VIETQR_PAYMENT:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tạo thanh toán VietQR",
      errorDetail: error.message,
    });
  }
}

// ─── 2. CHECK STATUS CHO KHÁCH (CHECKOUT POLLING) ───
async function checkPaymentStatus(req, res) {
  try {
    const rawCode =
      req.params.bookingCode || req.query.bookingCode || req.query.code || "";
    const bookingCode = String(rawCode).trim();

    if (!bookingCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu bookingCode." });
    }

    const result = await pool.query(
      `SELECT p.status AS pay_status, p.paid_amount, p.expected_amount, 
              b.payment_status, b.status AS booking_status
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $1
       ORDER BY p.created_at DESC NULLS LAST LIMIT 1`,
      [bookingCode],
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, paid: false, status: "pending" });
    }

    const row = result.rows[0];
    const isCompleted =
      String(row.pay_status).toLowerCase() === "paid" ||
      String(row.payment_status).toLowerCase() === "paid" ||
      String(row.booking_status).toLowerCase() === "confirmed";

    return res.json({
      success: true,
      paid: isCompleted,
      status: isCompleted ? "paid" : "pending",
      booking_status: row.booking_status,
      payment: {
        status: isCompleted ? "paid" : "pending",
        paid_amount: row.paid_amount,
        expected_amount: row.expected_amount,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── 3. KIỂM TRA NGAY TẠI CHECKOUT KHÁCH ───
async function confirmManualPayment(req, res) {
  return res.json({ success: true });
}

// ─── 4. WEBHOOK SEPAY NHẬN TÍN HIỆU 24/7 ───
async function handleBankWebhook(req, res) {
  try {
    const body = req.body || {};
    const transferAmount = Number(
      body.transferAmount ||
        body.amount ||
        body.amount_in ||
        body.amount_out ||
        0,
    );
    const content = String(
      body.content || body.description || body.transaction_content || "",
    );
    const transactionId = String(
      body.referenceCode || body.id || `TXN_${Date.now()}`,
    );

    // XỬ LÝ TIỀN RA (PAYOUT)
    if (content.toUpperCase().includes("PAYOUT")) {
      const match = content.match(/PAYOUT\s*([a-zA-Z0-9_-]+)/i);
      const hotelId = match ? match[1].trim() : null;

      if (hotelId) {
        await pool.query(
          `UPDATE public.booking
           SET payout_status = 'settled',
               payout_at = NOW()
           WHERE hotel_id::text = $1::text AND payment_status = 'paid'`,
          [hotelId],
        );

        try {
          await pool.query(
            `INSERT INTO public.payment_transaction (
              id, transaction_id, gateway, amount, status, raw_response, created_at
            ) VALUES (
              gen_random_uuid(), $1, 'SePay_Payout_Webhook', $2, 'success', $3, NOW()
            )`,
            [transactionId, transferAmount, JSON.stringify(body)],
          );
        } catch (e) {}

        return res.json({ success: true, message: "Webhook Payout Handled" });
      }
    }

    // XỬ LÝ TIỀN VÀO (BOOKING)
    const matchBooking = content.match(/BK\s*\d{6,12}/i);
    if (matchBooking) {
      const bookingCode = matchBooking[0].replace(/\s+/g, "").toUpperCase();
      await pool.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', status = 'confirmed', confirmed_at = NOW()
         WHERE booking_code ILIKE $1`,
        [`%${bookingCode}%`],
      );
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. 🌟 API QUYẾT TOÁN TỰ ĐỘNG THẦN THÁNH (TRA CỨU TRỰC TIẾP SEPAY API THEO THỜI GIAN THỰC) ───
async function checkPayoutStatus(req, res) {
  try {
    const hotelId = String(
      req.params.hotelId || req.query.hotelId || "",
    ).trim();
    const expectedAmount = Number(req.query.amount || 0);

    if (!hotelId) {
      return res.status(400).json({ success: false, message: "Thiếu hotelId" });
    }

    // 1. Kiểm tra trong DB xem đã đánh dấu thành công chưa
    const checkTx = await pool.query(
      `SELECT id FROM public.payment_transaction
       WHERE gateway ILIKE '%Payout%' 
         AND raw_response ILIKE $1
         AND created_at >= NOW() - INTERVAL '10 minutes'
       LIMIT 1`,
      [`%PAYOUT%${hotelId}%`],
    );

    if (checkTx.rows.length > 0) {
      return res.json({ success: true, settled: true, is_settled: true });
    }

    // 2. 🌟 GỌI TRỰC TIẾP SEPAY API ĐỂ ĐỌC SAO KÊ TRỪ TIỀN NGAY TỨC THÌ
    if (SEPAY_API_KEY) {
      try {
        const sepayRes = await fetch(
          "https://my.sepay.vn/userapi/transactions/list?limit=50",
          {
            method: "GET",
            headers: {
              Authorization: `Apikey ${SEPAY_API_KEY}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (sepayRes.ok) {
          const sepayData = await sepayRes.json();
          const transactions = sepayData?.transactions || [];

          const targetMemo = `PAYOUT${hotelId}`
            .replace(/[^A-Z0-9]/gi, "")
            .toUpperCase();

          // Tìm xem có giao dịch tiền trừ (amount_out > 0) có chữ PAYOUT + ID không
          const matched = transactions.find((tx) => {
            const rawContent = String(
              tx.transaction_content || tx.content || tx.description || "",
            ).toUpperCase();
            const cleanContent = rawContent.replace(/[^A-Z0-9]/gi, "");

            const amountOut = Number(
              tx.amount_out || tx.transferAmount || tx.amount || 0,
            );

            const isCodeMatch =
              cleanContent.includes(targetMemo) ||
              (rawContent.includes("PAYOUT") &&
                rawContent.includes(hotelId.toUpperCase()));

            // Khớp số tiền hoặc có phát sinh tiền ra
            const isAmountMatch =
              expectedAmount > 0
                ? amountOut >= expectedAmount * 0.95
                : amountOut > 0;

            return isCodeMatch && isAmountMatch;
          });

          // NẾU TÌM THẤY GIAO DỊCH TRỪ TIỀN TRÊN SEPAY:
          if (matched) {
            console.log(
              `🎉 [SePay API MATCH]: Đã tìm thấy chuyển tiền cho khách sạn #${hotelId}`,
            );

            // Cập nhật Database ngay lập tức
            await pool.query(
              `UPDATE public.booking
               SET payout_status = 'settled',
                   payout_at = NOW()
               WHERE hotel_id::text = $1::text AND payment_status = 'paid'`,
              [hotelId],
            );

            try {
              await pool.query(
                `INSERT INTO public.payment_transaction (
                  id, transaction_id, gateway, amount, status, raw_response, created_at
                ) VALUES (
                  gen_random_uuid(), $1, 'SePay_Payout_API_Direct', $2, 'success', $3, NOW()
                )`,
                [
                  matched.reference_number || `SEPAY_${matched.id}`,
                  Number(matched.amount_out || expectedAmount),
                  JSON.stringify(matched),
                ],
              );
            } catch (e) {}

            return res.json({ success: true, settled: true, is_settled: true });
          }
        }
      } catch (apiErr) {
        console.warn("⚠️ Không kết nối được SePay API:", apiErr.message);
      }
    }

    return res.json({ success: true, settled: false, is_settled: false });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
  checkPayoutStatus,
  getOwnerBankAccount,
};
