require("dotenv").config();
const pool = require("../config/database");

// Lấy API Key từ Render Environment Variables
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

const DEFAULT_PLATFORM_BANK = {
  bankId: "MBBank",
  bankName: "MBBank",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

/**
 * 🌟 LẤY THÔNG TIN TÀI KHOẢN NGÂN HÀNG CỦA KHÁCH SẠN
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
        .replace(/\s+/g, "")
        .trim();

      if (cleanAcc.length >= 6) {
        return {
          bankId: String(row.bank_code || row.bank_name || "MBBank").trim(),
          bankName: String(row.bank_name || row.bank_code || "MBBank").trim(),
          accountNumber: cleanAcc,
          accountName: String(
            row.bank_account_holder || row.name || "CHU KHACH SAN",
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

// ─── 1. TẠO MÃ VIETQR ĐỘNG ───
async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    const code = String(bookingCode || req.body.booking_code || "").trim();

    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "bookingCode là bắt buộc." });
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
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn đặt phòng." });
    }

    const expectedAmount = Math.round(
      Number(amount || booking.total_price || 0),
    );
    const bank = await getOwnerBankAccount(booking.hotel_id);

    const cleanBankName = encodeURIComponent(
      bank.bankName || bank.bankId || "MBBank",
    );
    const cleanAccNo = encodeURIComponent(bank.accountNumber);
    const cleanDes = encodeURIComponent(booking.booking_code);

    const qrCodeUrl = `https://qr.sepay.vn/img?acc=${cleanAccNo}&bank=${cleanBankName}&amount=${expectedAmount}&des=${cleanDes}`;

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
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. NÚT KIỂM TRA NGAY: ĐỐI SOÁT SEPAY API TRỰC TIẾP ───
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
        message: "Giao dịch đã được xác nhận thành công!",
      });
    }

    const reqAmount = Number(amount || 0);
    const pExpected = Number(booking.expected_amount || 0);
    const total = Number(booking.total_price || 0);
    const expected =
      reqAmount > 0 ? reqAmount : pExpected > 0 ? pExpected : total;

    let isVerified = false;
    let actualPaid = expected;

    if (SEPAY_API_KEY) {
      try {
        console.log(
          `🔍 [SePay API Check]: Tra cứu mã ${booking.booking_code} trên SePay...`,
        );
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
            const isAmountMatch = amountIn >= expected * 0.95; // Cho phép sai số 5%

            return isCodeMatch && isAmountMatch;
          });

          if (matchedTx) {
            isVerified = true;
            actualPaid = Number(
              matchedTx.amount_in || matchedTx.transferAmount || expected,
            );
            console.log(
              `✅ [SePay API Match]: Khớp giao dịch thành công! Số tiền: ${actualPaid}đ`,
            );
          }
        }
      } catch (apiErr) {
        console.warn("⚠️ Lỗi gọi SePay API:", apiErr.message);
      }
    }

    if (!isVerified) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Hệ thống SePay chưa ghi nhận giao dịch. Vui lòng chờ 5-10 giây rồi thử lại!",
      });
    }

    // CẬP NHẬT DATABASE AN TOÀN TUYỆT ĐỐI
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [booking.id],
      );

      if (booking.payment_id) {
        await client.query(
          `UPDATE public.payment SET status = 'paid', paid_amount = $1, paid_at = NOW(), updated_at = NOW() WHERE id = $2`,
          [actualPaid, booking.payment_id],
        );
      } else {
        await client.query(
          `INSERT INTO public.payment (id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, 'VietQR', $2, $3, 'paid', NOW(), NOW(), NOW())`,
          [booking.id, expected, actualPaid],
        );
      }

      await client.query("COMMIT");

      // Xóa temporary_locks không bọc trong transaction để tránh crash ngầm
      try {
        await client.query(
          `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
          [booking.id],
        );
      } catch (e) {}

      client.release();

      return res.json({
        success: true,
        paid: true,
        status: "paid",
        paidAmount: actualPaid,
        message: "Xác thực thanh toán thành công!",
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

// ─── 3. POLLING TRẠNG THÁI REAL-TIME CHO FRONTEND (MỖI 2.5 GIÂY) ───
async function checkPaymentStatus(req, res) {
  try {
    const rawCode =
      req.params.bookingCode || req.query.bookingCode || req.query.code || "";
    const bookingCode = String(rawCode).trim();

    if (!bookingCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu mã bookingCode." });
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

// ─── 4. WEBHOOK TỰ ĐỘNG NHẬN TÍN HIỆU TỪ SEPAY 24/7 ───
async function handleBankWebhook(req, res) {
  try {
    const body = req.body || {};
    const transferAmount = Number(
      body.transferAmount ||
        body.amount ||
        body.transfer_amount ||
        body.amount_in ||
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

    console.log("🔔 [SePay Webhook Triggered]:", {
      content,
      transferAmount,
      transactionId,
    });

    // Trích xuất mã đơn BK linh hoạt (chấp nhận cả khoảng trắng hoặc viết thường)
    const match = content.match(/BK\s*\d{6,12}/i);
    if (!match) {
      console.warn("⚠️ Nội dung không chứa mã BK:", content);
      return res.status(200).json({
        success: true,
        message: "Nội dung giao dịch không chứa mã đơn đặt phòng (bỏ qua).",
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
      console.warn("⚠️ Không tìm thấy đơn trong database:", bookingCode);
      return res
        .status(200)
        .json({ success: true, message: "Không tìm thấy đơn phòng." });
    }

    const booking = bookingRes.rows[0];

    // Nếu đã duyệt rồi thì báo thành công luôn
    if (String(booking.payment_status).toLowerCase() === "paid") {
      return res
        .status(200)
        .json({ success: true, message: "Đơn này đã được duyệt trước đó." });
    }

    const expected = Number(
      booking.expected_amount || booking.total_price || 0,
    );

    // Cho phép dung sai 5%
    if (transferAmount < expected * 0.95) {
      return res.status(200).json({
        success: false,
        message: `Số tiền chuyển (${transferAmount}) nhỏ hơn số tiền yêu cầu (${expected}).`,
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Cập nhật booking
      await client.query(
        `UPDATE public.booking 
         SET payment_status = 'paid', status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [booking.id],
      );

      // 2. Cập nhật payment
      let paymentId = booking.payment_id;
      if (paymentId) {
        await client.query(
          `UPDATE public.payment 
           SET status = 'paid', paid_amount = $1, paid_at = NOW(), updated_at = NOW()
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

      // COMMIT NGAY để đảm bảo đơn hàng đã PAID thành công 100%
      await client.query("COMMIT");

      // 3. Xử lý các bảng phụ an toàn không làm rollback đơn chính
      try {
        await client.query(
          `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
          [booking.id],
        );
      } catch (lockErr) {
        console.warn("⚠️ Bỏ qua xóa temporary_locks:", lockErr.message);
      }

      try {
        await client.query(
          `INSERT INTO public.payment_transaction (
            id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
          ) VALUES (
            gen_random_uuid(), $1, $2, 'SePay_Webhook', $3, 'success', $4, NOW()
          )`,
          [paymentId, transactionId, transferAmount, JSON.stringify(body)],
        );
      } catch (txErr) {
        console.warn("⚠️ Bỏ qua ghi payment_transaction log:", txErr.message);
      }

      client.release();

      console.log(
        `✅ [SePay Webhook Thành Công]: Đã duyệt xong đơn ${bookingCode}!`,
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

module.exports = {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
  getOwnerBankAccount,
};
