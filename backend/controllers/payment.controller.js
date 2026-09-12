// backend/controllers/paymentController.js
require("dotenv").config();
const pool = require("../config/database");

// API Key của SePay (Cấu hình trong file .env: SEPAY_API_KEY=xxx)
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

// Tài khoản ngân hàng mặc định của sàn
const DEFAULT_PLATFORM_BANK = {
  bankId: process.env.PLATFORM_BANK_ID || "MB",
  bankName:
    process.env.PLATFORM_BANK_NAME || "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: process.env.PLATFORM_BANK_ACCOUNT || "0833404928",
  accountName: process.env.PLATFORM_BANK_HOLDER || "SU TRACH KHANG",
};

/**
 * Helper: Kiểm tra kiểu dữ liệu của cột trong PostgreSQL để tránh lỗi ép kiểu
 */
async function getColumnUdtName(client, tableName, columnName) {
  try {
    const res = await client.query(
      `SELECT udt_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
      [tableName, columnName],
    );
    return res.rows[0]?.udt_name || "varchar";
  } catch (err) {
    return "varchar";
  }
}

/**
 * Helper: Lấy giá trị hợp lệ của enum transaction_status_enum trong PostgreSQL
 */
async function getValidTxnStatus(client) {
  try {
    const res = await client.query(
      `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = 'transaction_status_enum'`,
    );
    const labels = res.rows.map((r) => r.enumlabel);
    const candidates = [
      "success",
      "SUCCESS",
      "completed",
      "COMPLETED",
      "paid",
      "PAID",
    ];
    for (const val of candidates) {
      if (labels.includes(val)) return val;
    }
    return labels[0] || "success";
  } catch (err) {
    return "success";
  }
}

/**
 * Helper: Lấy tài khoản ngân hàng của khách sạn hoặc tài khoản sàn
 */
async function getHotelOrPlatformBank(client, hotelId) {
  try {
    if (hotelId) {
      const res = await client.query(
        `SELECT h.bank_code, h.bank_name, h.bank_account, h.bank_account_holder
         FROM public.hotel h
         WHERE h.id = $1 LIMIT 1`,
        [hotelId],
      );
      const h = res.rows[0];
      if (h && h.bank_account && h.bank_code) {
        return {
          bankId: h.bank_code.toUpperCase(),
          bankName: h.bank_name || DEFAULT_PLATFORM_BANK.bankName,
          accountNumber: h.bank_account,
          accountName: (
            h.bank_account_holder || DEFAULT_PLATFORM_BANK.accountName
          ).toUpperCase(),
        };
      }
    }
  } catch (err) {
    console.warn(
      "⚠️ Không lấy được ngân hàng riêng của khách sạn, dùng mặc định:",
      err.message,
    );
  }
  return DEFAULT_PLATFORM_BANK;
}

/**
 * ─── HÀM CẬP NHẬT DATABASE KHI SEPAY XÁC THỰC THÀNH CÔNG ───
 * Đảm bảo ghi đúng chuẩn schema:
 * - payment.status = varchar(50)
 * - payment_transaction.status = transaction_status_enum
 */
async function applyPaidSuccessToDatabase(
  client,
  booking,
  paidAmount,
  gateway,
  transactionId,
  rawData,
) {
  const actualPaid = Math.round(Number(paidAmount));

  // 1. CẬP NHẬT HOẶC TẠO BẢN GHI PAYMENT (status là varchar(50))
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
    const insertPaymentRes = await client.query(
      `INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, paid_amount, 
        qr_code, qr_content, status, paid_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VietQR', $2, $3, 
        $4, $5, 'paid', NOW(), NOW(), NOW()
      ) RETURNING id`,
      [
        booking.id,
        booking.expected_amount || actualPaid,
        actualPaid,
        booking.qr_code || "",
        booking.booking_code,
      ],
    );
    paymentId = insertPaymentRes.rows[0].id;
  }

  // 2. CẬP NHẬT BẢNG BOOKING (Kiểm tra kiểu dữ liệu để cast an toàn)
  const paymentStatusUdt = await getColumnUdtName(
    client,
    "booking",
    "payment_status",
  );
  const bookingStatusUdt = await getColumnUdtName(client, "booking", "status");

  let updateBookingSql = `UPDATE public.booking SET updated_at = NOW(), confirmed_at = COALESCE(confirmed_at, NOW())`;

  if (paymentStatusUdt.includes("enum")) {
    updateBookingSql += `, payment_status = 'paid'::public.${paymentStatusUdt}`;
  } else {
    updateBookingSql += `, payment_status = 'paid'`;
  }

  if (bookingStatusUdt.includes("enum")) {
    updateBookingSql += `, status = 'confirmed'::public.${bookingStatusUdt}`;
  } else {
    updateBookingSql += `, status = 'confirmed'`;
  }

  updateBookingSql += ` WHERE id = $1`;
  await client.query(updateBookingSql, [booking.id]);

  // 3. THÊM VÀO BẢNG PAYMENT_TRANSACTION (status là transaction_status_enum, raw_response là text)
  const validTxnStatus = await getValidTxnStatus(client);
  const rawText =
    typeof rawData === "string" ? rawData : JSON.stringify(rawData || {});

  await client.query(
    `INSERT INTO public.payment_transaction (
      id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5::public.transaction_status_enum, $6, NOW()
    )`,
    [
      paymentId,
      transactionId || `TXN_${Date.now()}`,
      gateway || "SePay",
      actualPaid,
      validTxnStatus,
      rawText,
    ],
  );

  // 4. GIẢI PHÓNG KHÓA PHÒNG TẠM THỜI
  try {
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [booking.id],
    );
  } catch (lockErr) {
    console.warn("Giải phóng temporary_locks:", lockErr.message);
  }
}

// ─── 1. TẠO MÃ THANH TOÁN VIETQR ĐỘNG (LƯU VÀO BẢNG PAYMENT) ───
async function createVietQrPayment(req, res) {
  const client = await pool.connect();
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    const code = bookingCode || req.body.booking_code;

    if (!code || !amount) {
      client.release();
      return res.status(400).json({
        success: false,
        message: "bookingCode và amount là bắt buộc.",
      });
    }

    const bookingResult = await client.query(
      `SELECT id, booking_code, total_price, hotel_id 
       FROM public.booking
       WHERE (booking_code = $1 OR id::text = $1)
       LIMIT 1`,
      [code],
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      client.release();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt phòng.",
      });
    }

    const expectedAmount = Math.round(Number(amount));
    const bank = await getHotelOrPlatformBank(client, booking.hotel_id);

    const qrCodeUrl = `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(bank.accountName)}`;

    // Tìm xem đã có bản ghi payment chưa
    const checkPayment = await client.query(
      `SELECT id FROM public.payment WHERE booking_id = $1 LIMIT 1`,
      [booking.id],
    );

    let paymentId;
    if (checkPayment.rows.length > 0) {
      paymentId = checkPayment.rows[0].id;
      await client.query(
        `UPDATE public.payment 
         SET expected_amount = $1, qr_code = $2, qr_content = $3, updated_at = NOW()
         WHERE id = $4`,
        [expectedAmount, qrCodeUrl, booking.booking_code, paymentId],
      );
    } else {
      // Đúng chuẩn schema: status là varchar(50) DEFAULT 'pending'
      const insertPayment = await client.query(
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

    client.release();

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
    client.release();
    console.error("❌ LỖI CREATE_VIETQR_PAYMENT:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tạo thanh toán VietQR",
      errorDetail: error.message,
    });
  }
}

// ─── 2. NÚT "KIỂM TRA NGAY": GỌI API SEPAY XÁC THỰC THỰC TẾ TRƯỚC KHI LƯU ───
async function confirmManualPayment(req, res) {
  const client = await pool.connect();
  try {
    const { bookingCode, amount } = req.body || {};
    const code = bookingCode || req.body.booking_code;

    if (!code) {
      client.release();
      return res
        .status(400)
        .json({ success: false, message: "Thiếu mã đơn bookingCode." });
    }

    // 1. Kiểm tra đơn đặt phòng trong Database (Chưa bật BEGIN để tránh lock/abort)
    const bookingRes = await client.query(
      `SELECT b.*, p.id AS payment_id, p.expected_amount, p.status AS payment_status_record
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $1
       LIMIT 1`,
      [code],
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      client.release();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn phòng." });
    }

    // Nếu webhook SePay đã chạy trước đó và đã lưu paid thì báo thành công luôn
    if (
      String(booking.payment_status).toLowerCase() === "paid" &&
      String(booking.status).toLowerCase() === "confirmed"
    ) {
      client.release();
      return res.json({
        success: true,
        paid: true,
        status: "paid",
        message: "Giao dịch đã được xác thực thành công!",
      });
    }

    const expected = Number(
      booking.expected_amount || booking.total_price || amount || 0,
    );

    // 2. CHỦ ĐỘNG GỌI API SEPAY ĐỂ QUÉT DANH SÁCH BIẾN ĐỘNG SỐ DƯ
    let isVerified = false;
    let actualPaid = expected;
    let refNumber = `MANUAL_${Date.now()}`;

    if (SEPAY_API_KEY) {
      try {
        const sepayRes = await fetch(
          "https://my.sepay.vn/userapi/transactions/list?limit=25",
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

          // Tìm giao dịch khớp mã đơn bookingCode và số tiền đủ
          const matchedTx = transactions.find((tx) => {
            const content = String(
              tx.transaction_content || tx.content || "",
            ).toUpperCase();
            const amountIn = Number(tx.amount_in || tx.transferAmount || 0);
            return (
              content.includes(booking.booking_code.toUpperCase()) &&
              amountIn >= expected
            );
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
        console.warn("⚠️ Lỗi gọi SePay API đối soát:", apiErr.message);
      }
    }

    // 3. NẾU SEPAY CHƯA THẤY GIAO DỊCH KHỚP -> TUYỆT ĐỐI KHÔNG LƯU DB, KHÔNG DUYỆT
    if (!isVerified) {
      client.release();
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Hệ thống SePay chưa ghi nhận biến động số dư cho đơn này. Vui lòng chờ 5-10 giây rồi bấm kiểm tra lại!",
      });
    }

    // 4. SEPAY ĐÃ XÁC THỰC THÀNH CÔNG -> MỞ TRANSACTION VÀ LƯU DATABASE
    await client.query("BEGIN");

    await applyPaidSuccessToDatabase(
      client,
      booking,
      actualPaid,
      "SePay_API",
      refNumber,
      { verifiedBy: "SePay_Live_Check", bookingCode: booking.booking_code },
    );

    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      paid: true,
      status: "paid",
      paidAmount: actualPaid,
      message: "SePay đã xác thực thanh toán thành công!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI CONFIRM_MANUAL_PAYMENT:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. CHECK STATUS CHO FRONTEND POLLING REAL-TIME (MỖI 2.5 GIÂY) ───
async function checkPaymentStatus(req, res) {
  try {
    const bookingCode =
      req.query.bookingCode ||
      req.query.code ||
      req.params.bookingCode ||
      req.params.code;

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
       ORDER BY p.created_at DESC LIMIT 1`,
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
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const transferAmount = Number(
      body.transferAmount || body.amount || body.transfer_amount || 0,
    );
    const content = String(
      body.content || body.description || body.transaction_content || "",
    );
    const transactionId = String(
      body.referenceCode ||
        body.reference_number ||
        body.id ||
        `TXN_${Date.now()}`,
    );

    console.log("🔔 [SePay Webhook Nhận Được]:", {
      content,
      transferAmount,
      transactionId,
    });

    // Trích xuất mã đơn bookingCode (VD: BK12345678)
    const match = content.match(/BK\d{7,10}/i);
    if (!match) {
      client.release();
      return res.status(200).json({
        success: true,
        message: "Nội dung giao dịch không chứa mã đơn đặt phòng (bỏ qua).",
      });
    }

    const bookingCode = match[0].toUpperCase();

    // Tìm đơn trong Database trước khi BEGIN
    const bookingRes = await client.query(
      `SELECT b.id, b.booking_code, b.total_price, b.payment_status,
              p.id AS payment_id, p.expected_amount
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1
       LIMIT 1`,
      [`%${bookingCode}%`],
    );

    if (bookingRes.rows.length === 0) {
      client.release();
      return res
        .status(200)
        .json({ success: true, message: "Không tìm thấy đơn phòng." });
    }

    const booking = bookingRes.rows[0];

    // Nếu đã thanh toán rồi thì trả lời SePay thành công để không bắn lại
    if (String(booking.payment_status).toLowerCase() === "paid") {
      client.release();
      return res
        .status(200)
        .json({ success: true, message: "Đơn này đã được duyệt trước đó." });
    }

    const expected = Number(
      booking.expected_amount || booking.total_price || 0,
    );

    // Xác thực số tiền: Khách phải chuyển đủ hoặc thừa
    if (transferAmount < expected) {
      client.release();
      console.warn(
        `⚠️ Khách chuyển thiếu: Cần ${expected}đ, nhưng nhận được ${transferAmount}đ`,
      );
      return res.status(200).json({
        success: false,
        message: `Số tiền chuyển (${transferAmount}) nhỏ hơn số tiền yêu cầu (${expected}). Không thể duyệt tự động.`,
      });
    }

    // ĐÚNG SỐ TIỀN -> MỞ TRANSACTION VÀ LƯU VÀO DATABASE
    await client.query("BEGIN");

    await applyPaidSuccessToDatabase(
      client,
      booking,
      transferAmount,
      "SePay_Webhook",
      transactionId,
      body,
    );

    await client.query("COMMIT");
    client.release();

    console.log(
      `✅ [SePay Webhook Thành Công]: Đã lưu Database đơn ${bookingCode}!`,
    );

    return res.status(200).json({
      success: true,
      message: `Đã duyệt đơn ${bookingCode} thành công!`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI XỬ LÝ WEBHOOK SEPAY:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
};
