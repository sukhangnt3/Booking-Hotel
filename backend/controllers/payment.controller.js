// backend/controllers/paymentController.js
require("dotenv").config();
const pool = require("../config/database");

// Cấu hình SePay API Key (Lấy từ https://my.sepay.vn)
const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

// Tài khoản dự phòng mặc định của sàn
const DEFAULT_BANK_CONFIG = {
  bankId: "MB",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: "0833404928",
  accountName: "SU TRACH KHANG",
};

async function getValidEnumValue(client, enumTypeName, preferredValues) {
  try {
    const res = await client.query(
      `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = $1`,
      [enumTypeName],
    );
    const validLabels = res.rows.map((r) => r.enumlabel);

    for (const val of preferredValues) {
      if (validLabels.includes(val)) return val;
    }
    const nonPending = validLabels.find(
      (l) => !l.toLowerCase().includes("pending"),
    );
    return nonPending || validLabels[0] || preferredValues[0];
  } catch (err) {
    return preferredValues[0];
  }
}

async function getTableColumns(client, tableName) {
  try {
    const res = await client.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    return res.rows.map((r) => r.column_name);
  } catch (err) {
    return [];
  }
}

// ─── HÀM CẬP NHẬT DATABASE KHI XÁC THỰC THÀNH CÔNG TỪ SEPAY ───
async function applyPaidSuccessToDatabase(
  client,
  booking,
  paidAmount,
  gateway,
  transactionId,
  rawData,
) {
  const totalPrice = Number(booking.total_price || 0);
  const expected = Number(booking.expected_amount || totalPrice);

  const isDeposit = expected < totalPrice;
  const finalPaymentType = isDeposit ? "DEPOSIT_30" : "FULL";
  const depositAmountVal = isDeposit ? paidAmount : 0;
  const remainingAmountVal = isDeposit ? totalPrice - paidAmount : 0;

  const validBookingPaymentStatus = await getValidEnumValue(
    client,
    "booking_payment_status_enum",
    ["paid", "PAID", "completed", "COMPLETED", "success"],
  );

  const validPaymentStatus = await getValidEnumValue(
    client,
    "payment_status_enum",
    ["completed", "COMPLETED", "success", "SUCCESS", "paid", "PAID"],
  );

  const validTxnStatus = await getValidEnumValue(
    client,
    "transaction_status_enum",
    ["success", "SUCCESS", "completed", "COMPLETED"],
  );

  const bookingCols = await getTableColumns(client, "booking");
  const setClauses = [];
  const updateParams = [];
  let paramIdx = 1;

  if (bookingCols.includes("payment_status")) {
    setClauses.push(
      `payment_status = $${paramIdx}::text::public.booking_payment_status_enum`,
    );
    updateParams.push(validBookingPaymentStatus);
    paramIdx++;
  }

  if (bookingCols.includes("status")) {
    setClauses.push(`status = 'confirmed'::public.booking_status_enum`);
  }

  if (bookingCols.includes("customer_paid")) {
    setClauses.push(`customer_paid = $${paramIdx}`);
    updateParams.push(paidAmount);
    paramIdx++;
  }

  if (bookingCols.includes("deposit_amount")) {
    setClauses.push(`deposit_amount = $${paramIdx}`);
    updateParams.push(depositAmountVal);
    paramIdx++;
  }

  if (bookingCols.includes("remaining_amount")) {
    setClauses.push(`remaining_amount = $${paramIdx}`);
    updateParams.push(remainingAmountVal);
    paramIdx++;
  }

  if (bookingCols.includes("payment_type")) {
    setClauses.push(`payment_type = $${paramIdx}`);
    updateParams.push(finalPaymentType);
    paramIdx++;
  }

  if (bookingCols.includes("confirmed_at")) {
    setClauses.push(`confirmed_at = NOW()`);
  }

  if (bookingCols.includes("updated_at")) {
    setClauses.push(`updated_at = NOW()`);
  }

  if (setClauses.length > 0) {
    updateParams.push(booking.id);
    const updateBookingQuery = `
      UPDATE public.booking 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIdx}
    `;
    await client.query(updateBookingQuery, updateParams);
  }

  let paymentId = booking.payment_id;
  if (paymentId) {
    await client.query(
      `UPDATE public.payment 
       SET status = $1::text::public.payment_status_enum,
           paid_amount = $2,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [validPaymentStatus, paidAmount, paymentId],
    );
  } else {
    const newPay = await client.query(
      `INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VietQR', $2, $3, $4::text::public.payment_status_enum, NOW(), NOW(), NOW()
      ) RETURNING id`,
      [booking.id, expected, paidAmount, validPaymentStatus],
    );
    paymentId = newPay.rows[0].id;
  }

  await client.query(
    `INSERT INTO public.payment_transaction (
      id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5::text::public.transaction_status_enum, $6, NOW()
    )`,
    [
      paymentId,
      transactionId,
      gateway || "SePay_VietQR",
      paidAmount,
      validTxnStatus,
      JSON.stringify(rawData),
    ],
  );

  // Giải phóng khóa phòng tạm thời
  try {
    await client.query(
      `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
      [booking.id],
    );
  } catch (lockErr) {
    console.warn("Giải phóng temporary_locks:", lockErr.message);
  }
}

// ─── 1. TẠO MÃ THANH TOÁN VIETQR ĐỘNG THEO NGÂN HÀNG CỦA OWNER ───
async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    const code = bookingCode || req.body.booking_code;

    if (!code || !amount) {
      return res.status(400).json({
        success: false,
        message: "bookingCode và amount là bắt buộc.",
      });
    }

    // Truy vấn thông tin đơn phòng cùng tài khoản ngân hàng của Owner khách sạn này
    const bookingResult = await pool.query(
      `SELECT b.id, b.booking_code, b.total_price, b.hotel_id,
              COALESCE(h.bank_code, u.bank_code, 'MB') AS bank_id,
              COALESCE(h.bank_name, u.bank_name, 'MBBank') AS bank_name,
              COALESCE(h.bank_account, u.bank_account, '0833404928') AS account_number,
              COALESCE(h.bank_account_holder, u.bank_account_holder, 'SU TRACH KHANG') AS account_name
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.users u ON u.id = h.owner_id
       WHERE (b.booking_code = $1 OR b.id::text = $1)
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

    const expectedAmount = Math.round(Number(amount));

    const activeBank = {
      bankId: (booking.bank_id || DEFAULT_BANK_CONFIG.bankId).toUpperCase(),
      bankName: booking.bank_name || DEFAULT_BANK_CONFIG.bankName,
      accountNumber:
        booking.account_number || DEFAULT_BANK_CONFIG.accountNumber,
      accountName: (
        booking.account_name || DEFAULT_BANK_CONFIG.accountName
      ).toUpperCase(),
    };

    const qrCodeUrl = `https://img.vietqr.io/image/${activeBank.bankId}-${activeBank.accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(activeBank.accountName)}`;

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
      const pendingStatus = await getValidEnumValue(
        pool,
        "payment_status_enum",
        ["pending", "PENDING", "unpaid"],
      );

      const insertPayment = await pool.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, qr_code, qr_content, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, 0, $3, $4, $5::text::public.payment_status_enum, NOW(), NOW()
        ) RETURNING id`,
        [
          booking.id,
          expectedAmount,
          qrCodeUrl,
          booking.booking_code,
          pendingStatus,
        ],
      );
      paymentId = insertPayment.rows[0].id;
    }

    return res.json({
      success: true,
      paymentId,
      bookingCode: booking.booking_code,
      expectedAmount,
      paymentType: paymentType || "FULL",
      bankInfo: activeBank,
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

// ─── 2. NÚT "KIỂM TRA NGAY": GỌI API SEPAY ĐỐI SOÁT BIẾN ĐỘNG SỐ DƯ THỰC TẾ TRƯỚC KHI LƯU ───
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

    // 1. Kiểm tra đơn hàng trong Database
    const bookingRes = await client.query(
      `SELECT b.*, p.id AS payment_id, p.expected_amount, p.status AS payment_status_record
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1 OR b.id::text = $1
       LIMIT 1
       FOR UPDATE`,
      [code],
    );

    const booking = bookingRes.rows[0];
    if (!booking) {
      client.release();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn phòng." });
    }

    // Nếu webhook đã xử lý xong và đã lưu paid thì trả về thành công ngay
    if (
      ["paid", "PAID", "completed"].includes(
        String(booking.payment_status || ""),
      ) &&
      ["confirmed", "CONFIRMED"].includes(String(booking.status || ""))
    ) {
      client.release();
      return res.json({
        success: true,
        paid: true,
        status: "paid",
        message: "Giao dịch đã được SePay xác thực thành công!",
      });
    }

    const expected = Number(
      booking.expected_amount || booking.total_price || amount || 0,
    );

    // 2. NẾU CÓ SEPAY API KEY -> CHỦ ĐỘNG GỌI SEPAY API KIỂM TRA LỊCH SỬ GIAO DỊCH
    let sepayVerified = false;
    let actualPaidAmount = 0;
    let transactionRef = "";

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
            sepayVerified = true;
            actualPaidAmount = Number(
              matchedTx.amount_in || matchedTx.transferAmount || expected,
            );
            transactionRef =
              matchedTx.reference_number || `SEPAY_${matchedTx.id}`;
          }
        }
      } catch (apiErr) {
        console.warn("⚠️ Lỗi gọi SePay API đối soát:", apiErr.message);
      }
    }

    // 3. NẾU SEPAY CHƯA THẤY GIAO DỊCH KHỚP -> TUYỆT ĐỐI KHÔNG LƯU DATABASE, KHÔNG CHO QUA TRANG
    if (!sepayVerified) {
      client.release();
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Hệ thống SePay chưa nhận được biến động số dư cho đơn này hoặc chưa đủ tiền. Vui lòng chờ 5-10 giây rồi thử lại!",
      });
    }

    // 4. SEPAY ĐÃ XÁC THỰC CHÍNH XÁC -> LƯU DATABASE CHÍNH THỨC
    await client.query("BEGIN");
    await applyPaidSuccessToDatabase(
      client,
      booking,
      actualPaidAmount,
      "SePay_API_Verified",
      transactionRef,
      { verifiedBy: "SePay_Live_Check", bookingCode: booking.booking_code },
    );
    await client.query("COMMIT");
    client.release();

    return res.json({
      success: true,
      paid: true,
      status: "paid",
      paidAmount: actualPaidAmount,
      message: "SePay đã xác thực giao dịch thành công!",
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
      `SELECT p.status, p.paid_amount, p.expected_amount, b.payment_status, b.status AS booking_status
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
      ["completed", "COMPLETED", "success", "SUCCESS", "paid", "PAID"].includes(
        String(row.status || ""),
      ) ||
      ["paid", "PAID", "completed"].includes(
        String(row.payment_status || ""),
      ) ||
      ["confirmed", "CONFIRMED"].includes(String(row.booking_status || ""));

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

// ─── 4. WEBHOOK TIẾP NHẬN BIẾN ĐỘNG SỐ DƯ TỰ ĐỘNG TỪ SEPAY ───
async function handleBankWebhook(req, res) {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const gateway = body.gateway || body.bank_brand_name || "SePay";
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

    console.log("🔔 [SePay Webhook Triggered]:", {
      content,
      transferAmount,
      gateway,
      transactionId,
    });

    // Trích xuất mã đơn bookingCode (VD: BK12345678)
    const match = content.match(/(BK\d{7,10}|GST\d{6,8})/i);
    if (!match) {
      client.release();
      return res.status(200).json({
        success: true,
        message: "Giao dịch không chứa mã đơn đặt phòng GoStay (bỏ qua).",
      });
    }

    const bookingCode = match[0].toUpperCase();

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT b.id, b.booking_code, b.total_price, 
              p.id AS payment_id, p.expected_amount, p.status AS payment_status
       FROM public.booking b
       LEFT JOIN public.payment p ON p.booking_id = b.id
       WHERE b.booking_code ILIKE $1
       FOR UPDATE`,
      [`%${bookingCode}%`],
    );

    if (bookingRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(200).json({
        success: true,
        message: "Không tìm thấy đơn đặt phòng tương ứng với mã.",
      });
    }

    const booking = bookingRes.rows[0];

    // Đã thanh toán trước đó
    if (
      ["paid", "PAID", "completed", "COMPLETED"].includes(
        String(booking.payment_status || ""),
      )
    ) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(200).json({
        success: true,
        message: "Đơn đặt phòng này đã được xác nhận thanh toán trước đó.",
      });
    }

    const totalPrice = Number(booking.total_price || 0);
    const expected = Number(booking.expected_amount || totalPrice);

    // Kiểm tra đúng và đủ số tiền
    if (transferAmount < expected) {
      await client.query("ROLLBACK");
      client.release();
      console.warn(
        `⚠️ Khách chuyển thiếu tiền đơn ${bookingCode}: Cần ${expected}đ, nhận ${transferAmount}đ`,
      );
      return res.status(200).json({
        success: false,
        message: `Số tiền chuyển (${transferAmount}) nhỏ hơn số tiền dự kiến (${expected}). Chưa thể duyệt.`,
      });
    }

    // ĐÚNG SỐ TIỀN -> LƯU DATABASE
    await applyPaidSuccessToDatabase(
      client,
      booking,
      transferAmount,
      gateway,
      transactionId,
      body,
    );

    await client.query("COMMIT");
    client.release();

    console.log(
      `✅ [SePay Xác Thực Thành Công]: Đơn ${bookingCode} đã lưu Database PAID!`,
    );

    return res.status(200).json({
      success: true,
      message: `Tự động duyệt thanh toán thành công cho đơn ${bookingCode}!`,
      booking_code: bookingCode,
      paid_amount: transferAmount,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("❌ LỖI WEBHOOK SEPAY:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
  handleBankWebhook,
  getValidEnumValue,
  getTableColumns,
};
