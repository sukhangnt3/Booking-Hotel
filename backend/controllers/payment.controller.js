require("dotenv").config();
const pool = require("../config/database");

// Lấy API Token của SePay từ biến môi trường
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

// BẢNG CHUẨN HÓA MÃ BIN NAPAS VÀ CODE NGÂN HÀNG CHUẨN
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

// 🌟 TÀI KHOẢN CỦA SÀN (ADMIN) - KẾT NỐI VỚI SEPAY ĐỂ NHẬN TIỀN CỦA KHÁCH
const DEFAULT_PLATFORM_BANK = {
  bankId: "MB",
  bankBin: "970422",
  bankName: "MB Bank",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

/**
 * 🌟 LẤY TÀI KHOẢN CỦA OWNER (CHỈ DÙNG ĐỂ ADMIN CHUYỂN TIỀN QUYẾT TOÁN CHO HỌ)
 */
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

// ─── 1. TẠO MÃ THANH TOÁN VIETQR: CỐ ĐỊNH 100% VỀ TÀI KHOẢN ADMIN ───
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

    // 🌟 SỬA TẠI ĐÂY: KHÁCH QUÉT QR LUÔN CHUYỂN VỀ TÀI KHOẢN SÀN (ADMIN)
    const bank = DEFAULT_PLATFORM_BANK;

    const cleanBankCode = encodeURIComponent(bank.bankId);
    const cleanAccNo = encodeURIComponent(bank.accountNumber);
    const cleanDes = encodeURIComponent(booking.booking_code);

    // Link tạo QR SePay về thẳng tài khoản Admin
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

// ─── 2. NÚT "KIỂM TRA NGAY": GỌI TRỰC TIẾP SEPAY API ĐỐI SOÁT ───
async function confirmManualPayment(req, res) {
  try {
    const { bookingCode, amount } = req.body || {};
    const code = String(bookingCode || req.body.booking_code || "").trim();

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu mã đơn bookingCode." });
    }

    const bookingRes = await pool.query(
      `SELECT b.*, p.id AS payment_id, p.expected_amount
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $1
       LIMIT 1`,
      [code],
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn phòng." });
    }

    if (
      String(booking.payment_status).toLowerCase() === "paid" &&
      String(booking.status).toLowerCase() === "confirmed"
    ) {
      return res.json({
        success: true,
        paid: true,
        status: "paid",
        message: "Giao dịch đã được xác thực thành công!",
      });
    }

    const reqAmount = Number(amount || 0);
    const pExpected = Number(booking.expected_amount || 0);
    const total = Number(booking.total_price || 0);
    const expected =
      reqAmount > 0 ? reqAmount : pExpected > 0 ? pExpected : total;

    let isVerified = false;
    let actualPaid = expected;
    let refNumber = `MANUAL_${Date.now()}`;

    if (SEPAY_API_KEY) {
      try {
        const sepayRes = await fetch(
          "https://my.sepay.vn/userapi/transactions/list?limit=100",
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

          const cleanBookingCode = booking.booking_code
            .replace(/[^a-zA-Z0-9]/g, "")
            .toUpperCase();

          const matchedTx = transactions.find((tx) => {
            const rawContent = String(
              tx.transaction_content ||
                tx.content ||
                tx.description ||
                tx.code ||
                "",
            ).toUpperCase();
            const cleanContent = rawContent.replace(/[^a-zA-Z0-9]/g, "");
            const amountIn = Number(
              tx.amount_in || tx.transferAmount || tx.amount || 0,
            );

            const isCodeMatch =
              cleanContent.includes(cleanBookingCode) ||
              rawContent.includes(booking.booking_code.toUpperCase());

            const isAmountMatch = amountIn >= expected * 0.95;
            return isCodeMatch && isAmountMatch;
          });

          if (matchedTx) {
            isVerified = true;
            actualPaid = Number(
              matchedTx.amount_in || matchedTx.transferAmount || expected,
            );
            refNumber = matchedTx.reference_number || `SEPAY_${matchedTx.id}`;
          }
        }
      } catch (apiErr) {
        console.warn("⚠️ [SePay API Check Lỗi]:", apiErr.message);
      }
    }

    if (!isVerified) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Chưa thấy biến động số dư khớp đơn này. Vui lòng thử lại sau 5s!",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE public.booking 
         SET payment_status = 'paid',
             status = 'confirmed',
             confirmed_at = COALESCE(confirmed_at, NOW()),
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id],
      );

      let paymentId = booking.payment_id;
      if (paymentId) {
        await client.query(
          `UPDATE public.payment 
           SET status = 'paid',
               paid_amount = $1,
               paid_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [actualPaid, paymentId],
        );
      } else {
        const newPay = await client.query(
          `INSERT INTO public.payment (
            id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, 'VietQR', $2, $3, 'paid', NOW(), NOW(), NOW()
          ) RETURNING id`,
          [booking.id, expected, actualPaid],
        );
        paymentId = newPay.rows[0].id;
      }

      await client.query("COMMIT");
      client.release();

      return res.json({
        success: true,
        paid: true,
        status: "paid",
        paidAmount: actualPaid,
        message: "SePay đã xác thực thanh toán thành công!",
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      client.release();
      throw dbErr;
    }
  } catch (error) {
    console.error("❌ LỖI CONFIRM_MANUAL_PAYMENT:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. CHECK STATUS CHO KHÁCH (CHECKOUT REAL-TIME POLLING) ───
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

// ─── 4. WEBHOOK SEPAY: XỬ LÝ CẢ TIỀN VÀO (KHÁCH TRẢ) VÀ TIỀN RA (ADMIN TRẢ OWNER) ───
async function handleBankWebhook(req, res) {
  try {
    const body = req.body || {};
    const transferAmount = Number(
      body.transferAmount ||
        body.amount ||
        body.transfer_amount ||
        body.amount_in ||
        body.amount_out ||
        0,
    );
    const content = String(
      body.content ||
        body.description ||
        body.transaction_content ||
        body.code ||
        "",
    );
    const transactionId = String(
      body.referenceCode ||
        body.reference_number ||
        body.id ||
        `TXN_${Date.now()}`,
    );
    const transferType = String(
      body.transferType || body.type || "",
    ).toLowerCase();

    console.log("🔔 [SePay Webhook Triggered]:", {
      transferType,
      content,
      transferAmount,
      transactionId,
    });

    // 🌟 TRƯỜNG HỢP A: TIỀN RA (ADMIN CHUYỂN KHOẢN CHO OWNER CÓ CHỮ "PAYOUT")
    if (content.toUpperCase().includes("PAYOUT") || transferType === "out") {
      const matchHotel = content.match(/PAYOUT\s*([a-zA-Z0-9_-]+)/i);
      const hotelId = matchHotel ? matchHotel[1].trim() : null;

      if (hotelId) {
        console.log(
          `💸 [SePay Payout Out]: Nhận diện giải ngân cho khách sạn #${hotelId}`,
        );

        // Cập nhật Database: Đánh dấu các đơn của khách sạn này là đã giải ngân
        await pool.query(
          `UPDATE public.booking
           SET payout_status = 'settled',
               payout_amount = COALESCE(payout_amount, 0) + $1,
               payout_at = NOW()
           WHERE hotel_id::text = $2::text AND payment_status = 'paid'`,
          [transferAmount, hotelId],
        );

        // Lưu vết lịch sử giao dịch chi
        try {
          await pool.query(
            `INSERT INTO public.payment_transaction (
              id, transaction_id, gateway, amount, status, raw_response, created_at
            ) VALUES (
              gen_random_uuid(), $1, 'SePay_Payout', $2, 'success', $3, NOW()
            )`,
            [transactionId, transferAmount, JSON.stringify(body)],
          );
        } catch (e) {}

        return res.status(200).json({
          success: true,
          message: `Đã tự động quyết toán giải ngân cho khách sạn #${hotelId}!`,
        });
      }
    }

    // 🌟 TRƯỜNG HỢP B: TIỀN VÀO (KHÁCH THANH TOÁN ĐƠN PHÒNG CÓ CHỮ "BK...")
    const match = content.match(/BK\s*\d{6,12}/i);
    if (!match) {
      return res.status(200).json({
        success: true,
        message: "Giao dịch không thuộc đơn phòng (bỏ qua).",
      });
    }

    const bookingCode = match[0].replace(/\s+/g, "").toUpperCase();

    const bookingRes = await pool.query(
      `SELECT b.id, b.booking_code, b.total_price, b.payment_status,
              p.id AS payment_id, p.expected_amount
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1
       LIMIT 1`,
      [`%${bookingCode}%`],
    );

    if (bookingRes.rows.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không tìm thấy đơn phòng." });
    }

    const booking = bookingRes.rows[0];

    if (String(booking.payment_status).toLowerCase() === "paid") {
      return res
        .status(200)
        .json({ success: true, message: "Đơn này đã được duyệt trước đó." });
    }

    const expected = Number(
      booking.expected_amount || booking.total_price || 0,
    );

    if (transferAmount < expected * 0.95) {
      return res.status(200).json({
        success: false,
        message: `Số tiền chuyển (${transferAmount}) nhỏ hơn số tiền yêu cầu (${expected}).`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE public.booking 
         SET payment_status = 'paid',
             status = 'confirmed',
             confirmed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [booking.id],
      );

      let paymentId = booking.payment_id;
      if (paymentId) {
        await client.query(
          `UPDATE public.payment 
           SET status = 'paid',
               paid_amount = $1,
               paid_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [transferAmount, paymentId],
        );
      } else {
        const newPay = await client.query(
          `INSERT INTO public.payment (
            id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, 'VietQR', $2, $3, 'paid', NOW(), NOW(), NOW()
          ) RETURNING id`,
          [booking.id, expected, transferAmount],
        );
        paymentId = newPay.rows[0].id;
      }

      await client.query("COMMIT");

      try {
        await client.query(
          `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
          [booking.id],
        );
      } catch (lockErr) {}

      try {
        await client.query(
          `INSERT INTO public.payment_transaction (
            id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'SePay_Webhook', $3, 'success', $4, NOW()
          )`,
          [paymentId, transactionId, transferAmount, JSON.stringify(body)],
        );
      } catch (txErr) {}

      client.release();

      console.log(
        `✅ [SePay Khách Thanh Toán Thành Công]: Đã duyệt đơn ${bookingCode}!`,
      );

      return res.status(200).json({
        success: true,
        message: `Đã duyệt đơn ${bookingCode} thành công!`,
      });
    } catch (dbErr) {
      await client.query("ROLLBACK");
      client.release();
      throw dbErr;
    }
  } catch (error) {
    console.error("❌ LỖI XỬ LÝ WEBHOOK SEPAY:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. API CHECK TRẠNG THÁI QUYẾT TOÁN CHO FRONTEND ADMIN POLLING TỰ ĐỘNG ───
async function checkPayoutStatus(req, res) {
  try {
    const hotelId = req.params.hotelId || req.query.hotelId;
    if (!hotelId) {
      return res.status(400).json({ success: false, message: "Thiếu hotelId" });
    }

    // Kiểm tra xem khách sạn này có giao dịch Payout gần nhất trong vòng 10 phút không
    const checkTx = await pool.query(
      `SELECT id, created_at FROM public.payment_transaction
       WHERE gateway = 'SePay_Payout' 
         AND raw_response ILIKE $1
         AND created_at >= NOW() - INTERVAL '10 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [`%PAYOUT${hotelId}%`],
    );

    const isSettled = checkTx.rows.length > 0;

    return res.json({
      success: true,
      settled: isSettled,
      is_settled: isSettled,
      payout_status: isSettled ? "completed" : "pending",
    });
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
