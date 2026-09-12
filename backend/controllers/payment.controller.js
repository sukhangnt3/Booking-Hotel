// backend/controllers/paymentController.js
require("dotenv").config();
const pool = require("../config/database");

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || "";

const NAPAS_BANK_BINS = {
  VCB: "970436",
  VIETCOMBANK: "970436",
  MB: "970422",
  MBB: "970422",
  MBBANK: "970422",
  TCB: "970407",
  TECHCOMBANK: "970407",
  ICB: "970415",
  CTG: "970415",
  VIETINBANK: "970415",
  BIDV: "970418",
  ACB: "970416",
  VPB: "970432",
  VPBANK: "970432",
  TPB: "970423",
  TPBANK: "970423",
  STB: "970403",
  SACOMBANK: "970403",
  VBA: "970405",
  AGRIBANK: "970405",
};

const DEFAULT_PLATFORM_BANK = {
  bankId: "970422",
  bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
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
      const cleanAcc = String(row.bank_account || "").replace(/\D/g, "");

      if (cleanAcc.length >= 6) {
        const rawCode = String(row.bank_code || row.bank_name || "VCB")
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "");
        const binCode = NAPAS_BANK_BINS[rawCode] || rawCode || "970436";

        return {
          bankId: binCode,
          bankName: row.bank_name || "Ngân hàng",
          accountNumber: cleanAcc,
          accountName: String(
            row.bank_account_holder || row.name || "CHỦ KHÁCH SẠN",
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

// ─── 1. TẠO MÃ THANH TOÁN VIETQR ───
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

    // Nếu đơn đã được duyệt paid trước đó rồi thì trả về thành công ngay
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

    // 🌟 SỐ TIỀN CẦN THANH TOÁN: ƯU TIÊN SỐ TIỀN CỌC / TIỀN GỬI LÊN TỪ CLIENT
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
        console.log(
          `🔍 Đang gọi SePay API kiểm tra đơn ${booking.booking_code} với số tiền cần: ${expected}đ...`,
        );
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

          // Tìm giao dịch chứa mã đơn BK... và chuyển đủ số tiền
          const matchedTx = transactions.find((tx) => {
            const content = String(
              tx.transaction_content || tx.content || tx.description || "",
            ).toUpperCase();
            const amountIn = Number(
              tx.amount_in || tx.transferAmount || tx.amount || 0,
            );

            const isCodeMatch = content.includes(
              booking.booking_code.toUpperCase(),
            );
            const isAmountMatch = amountIn >= expected * 0.95; // Chấp nhận nếu >= 95% để chống lệch tiền

            return isCodeMatch && isAmountMatch;
          });

          if (matchedTx) {
            isVerified = true;
            actualPaid = Number(
              matchedTx.amount_in || matchedTx.transferAmount || expected,
            );
            refNumber = matchedTx.reference_number || `SEPAY_${matchedTx.id}`;
            console.log(
              `✅ Khớp giao dịch SePay: Mã ${booking.booking_code}, Số tiền: ${actualPaid}`,
            );
          } else {
            console.warn(
              `⚠️ SePay trả về ${transactions.length} giao dịch gần nhất nhưng không khớp mã ${booking.booking_code}`,
            );
          }
        } else {
          console.error("❌ SePay API trả về mã lỗi HTTP:", sepayRes.status);
        }
      } catch (apiErr) {
        console.warn("⚠️ Lỗi kết nối SePay API:", apiErr.message);
      }
    } else {
      console.warn("⚠️ CHƯA CẤU HÌNH BIẾN SEPAY_API_KEY TRÊN RENDER!");
    }

    if (!isVerified) {
      return res.status(200).json({
        success: false,
        paid: false,
        status: "pending",
        message:
          "Hệ thống SePay chưa ghi nhận biến động số dư cho đơn này. Quý khách vui lòng chờ 5-10 giây rồi bấm kiểm tra lại!",
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
      body.transferAmount ||
        body.amount ||
        body.transfer_amount ||
        body.amount_in ||
        0,
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
      transactionId,
    });

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

    // Kiểm tra số tiền: chỉ cần >= 95% số tiền dự kiến trong payment
    const expected = Number(
      booking.expected_amount || booking.total_price || 0,
    );

    if (transferAmount < expected * 0.95) {
      console.warn(
        `Khách chuyển thiếu: Cần ${expected}đ, nhận được ${transferAmount}đ`,
      );
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
