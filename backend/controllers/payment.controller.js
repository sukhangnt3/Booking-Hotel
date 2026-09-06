// backend/controllers/payment.controller.js
require("dotenv").config();
const crypto = require("crypto");
const querystring = require("qs");
const pool = require("../config/database");

const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE;
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET;
const VNPAY_URL =
  process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_URL =
  process.env.VNPAY_RETURN_URL ||
  "http://localhost:5000/api/payments/vnpay-return";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

function getVnpayCreateDate() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ─── 1. TẠO LIÊN KẾT THANH TOÁN VNPAY ───
async function createVnpayUrl(req, res) {
  try {
    const { bookingCode, amount, orderInfo } = req.body || {};
    if (!bookingCode || !amount) {
      return res
        .status(400)
        .json({ message: "bookingCode và amount là bắt buộc." });
    }

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price FROM public.booking
       WHERE (booking_code = $1 OR id::text = $1)
       LIMIT 1`,
      [bookingCode],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    const finalAmount = Math.round(
      Number(amount) || Number(booking.total_price),
    );

    const rawIpAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const ipAddr = rawIpAddr.includes(":") ? "127.0.0.1" : rawIpAddr;

    const createDate = getVnpayCreateDate();
    const txnRef = `${booking.booking_code}_${Date.now()}`;

    let vnp_Params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNPAY_TMN_CODE,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${booking.booking_code}`,
      vnp_OrderType: "other",
      vnp_Amount: finalAmount * 100,
      vnp_ReturnUrl: VNPAY_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    const vnpayUrl = `${VNPAY_URL}?${querystring.stringify(vnp_Params, { encode: false })}`;

    // Tạo bản ghi giao dịch chờ vào bảng 15: payment
    await pool
      .query(
        `INSERT INTO public.payment (
        id, booking_id, payment_method, expected_amount, status, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'VNPay', $2, 'pending'::public.payment_status_enum, NOW(), NOW()
      )`,
        [booking.id, finalAmount],
      )
      .catch(() => {});

    return res.json({
      success: true,
      vnpayUrl,
      paymentUrl: vnpayUrl,
      bookingCode: booking.booking_code,
      amount: finalAmount,
    });
  } catch (error) {
    console.error("❌ LỖI CREATE_VNPAY_URL:", error);
    return res
      .status(500)
      .json({ message: "Lỗi Server", errorDetail: error.message });
  }
}

// ─── 2. NHẬN KẾT QUẢ VNPAY TRẢ VỀ (LƯU BẢNG 15 VÀ BẢNG 16: PAYMENT_TRANSACTION) ───
async function vnpayReturn(req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const responseCode = vnp_Params["vnp_ResponseCode"];
    const rawTxnRef = vnp_Params["vnp_TxnRef"] || "";
    const bookingCode = rawTxnRef.split("_")[0];
    const amount = Number(vnp_Params["vnp_Amount"] || 0) / 100;
    const vnpayTransactionNo = vnp_Params["vnp_TransactionNo"] || rawTxnRef;

    // A. THANH TOÁN THÀNH CÔNG (MÃ '00')
    if (secureHash === signed && responseCode === "00" && bookingCode) {
      // 1. Cập nhật bảng booking
      await pool.query(
        `UPDATE public.booking 
         SET payment_status = 'paid'::public.booking_payment_status_enum, 
             status = 'confirmed'::public.booking_status_enum, 
             confirmed_at = NOW(), 
             updated_at = NOW()
         WHERE booking_code = $1`,
        [bookingCode],
      );

      // 2. Cập nhật bảng 15: payment
      const paymentRes = await pool
        .query(
          `UPDATE public.payment 
         SET status = 'paid'::public.payment_status_enum, 
             paid_amount = $1,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE booking_id = (SELECT id FROM public.booking WHERE booking_code = $2 LIMIT 1)
         RETURNING id`,
          [amount, bookingCode],
        )
        .catch(() => ({ rows: [] }));

      const paymentId = paymentRes.rows[0]?.id;

      // 3. ── GHI NHẬN VÀO BẢNG 16: PAYMENT_TRANSACTION ──
      if (paymentId) {
        await pool
          .query(
            `INSERT INTO public.payment_transaction (
             id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
           ) VALUES (
             gen_random_uuid(), $1, $2, 'VNPay', $3, 'success', $4, NOW()
           )`,
            [
              paymentId,
              vnpayTransactionNo,
              Math.round(amount),
              JSON.stringify(vnp_Params),
            ],
          )
          .catch((e) => console.warn("Lưu ý payment_transaction:", e.message));
      }

      return res.redirect(
        `${FRONTEND_URL}/booking-success?success=true&code=${bookingCode}&amount=${amount}`,
      );
    }

    // B. GIAO DỊCH THẤT BẠI HOẶC BỊ HỦY
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&code=${bookingCode}&amount=${amount}&message=cancelled`,
    );
  } catch (error) {
    console.error("❌ LỖI VNPAY_RETURN:", error);
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&message=error`,
    );
  }
}

module.exports = { createVnpayUrl, vnpayReturn };
