// backend/controllers/paymentController.js
require("dotenv").config();
const pool = require("../config/database");

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

const DEFAULT_PLATFORM_BANK = {
  bankId: process.env.PLATFORM_BANK_ID || "MB",
  bankName:
    process.env.PLATFORM_BANK_NAME || "Ngân hàng TMCP Quân Đội (MBBank)",
  accountNumber: process.env.PLATFORM_BANK_ACCOUNT || "0833404928",
  accountName: process.env.PLATFORM_BANK_HOLDER || "SU TRACH KHANG",
};

async function getOwnerBankAccount(hotelId) {
  if (!hotelId) return DEFAULT_PLATFORM_BANK;
  try {
    const [hColsRes, uColsRes] = await Promise.all([
      pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel'`,
      ),
      pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'`,
      ),
    ]);

    const hCols = hColsRes.rows.map((r) => r.column_name.toLowerCase());
    const uCols = uColsRes.rows.map((r) => r.column_name.toLowerCase());

    let ownerJoin = "";
    if (hCols.includes("owner_id")) ownerJoin = "h.owner_id = u.id";
    else if (hCols.includes("user_id")) ownerJoin = "h.user_id = u.id";
    else if (hCols.includes("created_by")) ownerJoin = "h.created_by = u.id";

    const findCol = (cols, candidates) =>
      candidates.find((c) => cols.includes(c));

    const hAcc = findCol(hCols, [
      "bank_account",
      "bank_number",
      "account_number",
      "bank_no",
    ]);
    const hName = findCol(hCols, ["bank_name", "bank"]);
    const hCode = findCol(hCols, ["bank_code", "bank_id"]);
    const hHolder = findCol(hCols, [
      "bank_account_holder",
      "account_name",
      "bank_holder",
      "account_holder",
    ]);

    const uAcc = findCol(uCols, [
      "bank_account",
      "bank_number",
      "account_number",
      "bank_no",
    ]);
    const uName = findCol(uCols, ["bank_name", "bank"]);
    const uCode = findCol(uCols, ["bank_code", "bank_id"]);
    const uHolder = findCol(uCols, [
      "bank_account_holder",
      "account_name",
      "bank_holder",
      "account_holder",
      "full_name",
      "name",
    ]);

    const selectFields = ["h.id AS hotel_id", "h.name AS hotel_name"];
    if (hAcc) selectFields.push(`h.${hAcc} AS h_account`);
    if (hName) selectFields.push(`h.${hName} AS h_bank_name`);
    if (hCode) selectFields.push(`h.${hCode} AS h_bank_code`);
    if (hHolder) selectFields.push(`h.${hHolder} AS h_holder`);

    if (ownerJoin) {
      if (uAcc) selectFields.push(`u.${uAcc} AS u_account`);
      if (uName) selectFields.push(`u.${uName} AS u_bank_name`);
      if (uCode) selectFields.push(`u.${uCode} AS u_bank_code`);
      if (uHolder) selectFields.push(`u.${uHolder} AS u_holder`);
    }

    const sql = `
      SELECT ${selectFields.join(", ")}
      FROM public.hotel h
      ${ownerJoin ? `LEFT JOIN public.users u ON ${ownerJoin}` : ""}
      WHERE h.id = $1
      LIMIT 1
    `;

    const res = await pool.query(sql, [hotelId]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const acc = row.h_account || row.u_account;
      const code = row.h_bank_code || row.u_bank_code;
      const name = row.h_bank_name || row.u_bank_name;
      const holder = row.h_holder || row.u_holder || row.hotel_name;

      if (acc && String(acc).trim() !== "") {
        return {
          bankId: (code || "MB").toUpperCase().trim(),
          bankName: name || "Ngân hàng",
          accountNumber: String(acc).trim(),
          accountName: String(holder || "CHU KHACH SAN")
            .toUpperCase()
            .trim(),
        };
      }
    }
  } catch (err) {
    console.error(
      "❌ Lỗi getOwnerBankAccount trong paymentController:",
      err.message,
    );
  }
  return DEFAULT_PLATFORM_BANK;
}

// ─── 1. TẠO MÃ THANH TOÁN VIETQR ĐỘNG THEO TÀI KHOẢN OWNER ───
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

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price, hotel_id 
       FROM public.booking
       WHERE (booking_code = $1 OR id::text = $1)
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
    const bank = await getOwnerBankAccount(booking.hotel_id);

    const qrCodeUrl = `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(bank.accountName)}`;

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

// ─── 2. NÚT "KIỂM TRA NGAY": GỌI API SEPAY XÁC THỰC THỰC TẾ TRƯỚC KHI LƯU ───
async function confirmManualPayment(req, res) {
  try {
    const { bookingCode, amount } = req.body || {};
    const code = bookingCode || req.body.booking_code;

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

    const expected = Number(
      booking.expected_amount || booking.total_price || amount || 0,
    );

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

    if (!isVerified) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Hệ thống SePay chưa ghi nhận biến động số dư cho đơn này. Vui lòng chờ 5-10 giây rồi bấm kiểm tra lại!",
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

      await client.query(
        `INSERT INTO public.payment_transaction (
          id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'SePay_API', $3, 'success'::public.transaction_status_enum, $4, NOW()
        )`,
        [
          paymentId,
          refNumber,
          actualPaid,
          JSON.stringify({ verified: true, bookingCode: booking.booking_code }),
        ],
      );

      await client.query(
        `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
        [booking.id],
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

    const match = content.match(/BK\d{7,10}/i);
    if (!match) {
      return res.status(200).json({
        success: true,
        message: "Nội dung giao dịch không chứa mã đơn đặt phòng (bỏ qua).",
      });
    }

    const bookingCode = match[0].toUpperCase();

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

    if (transferAmount < expected) {
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

      await client.query(
        `INSERT INTO public.payment_transaction (
          id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'SePay_Webhook', $3, 'success'::public.transaction_status_enum, $4, NOW()
        )`,
        [paymentId, transactionId, transferAmount, JSON.stringify(body)],
      );

      await client.query(
        `DELETE FROM public.temporary_locks WHERE booking_id = $1`,
        [booking.id],
      );

      await client.query("COMMIT");
      client.release();

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
