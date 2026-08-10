const crypto = require("crypto");
const pool = require("../config/database");

const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE || "DEMOV210";
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET || "RAOOFUYGBSTALXWIDCOTEEDTMYNCBCPM";
const VNPAY_URL = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_URL = process.env.VNPAY_RETURN_URL || "http://localhost:5000/api/payments/vnpay-return";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      sorted[key] = obj[key];
    }
  });
  return sorted;
}

// Dùng để build chuỗi ký (KHÔNG encode) - đúng chuẩn VNPay
function buildSignData(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

// Dùng để build query string thật sự gắn vào URL (CÓ encode)
function buildQueryString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");
}

function buildVnpayUrl({ bookingCode, amount, orderInfo, ipAddr }) {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const createDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const txnRef = `${bookingCode}_${Date.now()}`;

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo || `Thanh toan don hang ${bookingCode}`,
    vnp_OrderType: "other",
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_IpAddr: ipAddr && ipAddr.includes(":") ? "127.0.0.1" : (ipAddr || "127.0.0.1"),
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(params);

  // Chữ ký phải tính trên chuỗi KHÔNG encode
  const signData = buildSignData(sortedParams);
  const secureHash = crypto.createHmac("sha512", VNPAY_HASH_SECRET).update(signData).digest("hex");

  // URL query string thì encode bình thường
  const queryString = buildQueryString({ ...sortedParams, vnp_SecureHash: secureHash });

  // Sanitize common typo/legacy hostnames to ensure correct VNPay sandbox domain
  const sanitizedBase = String(VNPAY_URL)
    .replace("sandbox.vnpay.vn", "sandbox.vnpayment.vn")
    .replace("vnpay.vn", "vnpayment.vn");

  return `${sanitizedBase}?${queryString}`;
}

async function createVnpayUrl(req, res, next) {
  try {
    const { bookingCode, amount, orderInfo } = req.body;
    if (!bookingCode || !amount) {
      return res.status(400).json({ message: "bookingCode và amount là bắt buộc." });
    }

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price FROM booking
       WHERE (booking_code = $1 OR id::text = $1)
       LIMIT 1`,
      [bookingCode],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    const finalAmount = Number(amount) || Number(booking.total_price) || 0;
    const rawIpAddr = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "127.0.0.1";
    const ipAddr = rawIpAddr && rawIpAddr.includes(":") ? "127.0.0.1" : rawIpAddr;

    const vnpayUrl = buildVnpayUrl({
      bookingCode: booking.booking_code,
      amount: finalAmount,
      orderInfo: orderInfo || `Thanh toan don hang ${booking.booking_code}`,
      ipAddr,
    });

    console.log("[payment.controller] Generated vnpayUrl:", vnpayUrl);

    try {
      await pool.query(
        `INSERT INTO payment (booking_id, payment_method, expected_amount, status, created_at)
         VALUES ($1, 'VNPay', $2, 'pending', NOW()) ON CONFLICT DO NOTHING`,
        [booking.id, finalAmount],
      );
    } catch (paymentError) {
      console.warn("Lưu ý: Không thể chèn vào bảng payment:", paymentError.message);
    }

    return res.json({ vnpayUrl, paymentUrl: vnpayUrl, bookingCode: booking.booking_code, amount: finalAmount });
  } catch (error) {
    return next(error);
  }
}

async function vnpayReturn(req, res, next) {
  try {
    const vnpParams = { ...req.query };
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = sortObject(vnpParams);

    // Phải dùng buildSignData (KHÔNG encode) để khớp với cách VNPay tính hash
    const signData = buildSignData(sortedParams);
    const checkHash = crypto.createHmac("sha512", VNPAY_HASH_SECRET).update(signData).digest("hex");

    if (checkHash !== secureHash) {
      console.error("[vnpayReturn] Signature mismatch. Expected:", secureHash, "Got:", checkHash);
      return res.redirect(`${FRONTEND_URL}/booking-success?success=false&message=invalid_signature`);
    }

    const responseCode = vnpParams.vnp_ResponseCode;
    const bookingCode = (vnpParams.vnp_TxnRef || "").split("_")[0];

    console.log("[vnpayReturn] Processing: responseCode=", responseCode, "bookingCode=", bookingCode);

    if (responseCode === "00" && bookingCode) {
      await pool.query(
        `UPDATE booking SET payment_status = 'paid', status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE booking_code = $1`,
        [bookingCode],
      );
      console.log("[vnpayReturn] Booking", bookingCode, "updated to confirmed");
      return res.redirect(`${FRONTEND_URL}/booking-success?success=true&code=${bookingCode}`);
    }

    console.warn("[vnpayReturn] Payment failed or cancelled: responseCode=", responseCode);
    return res.redirect(`${FRONTEND_URL}/booking-success?success=false&message=payment_failed`);
  } catch (error) {
    console.error("[vnpayReturn] Error:", error);
    return next(error);
  }
}

module.exports = { createVnpayUrl, vnpayReturn };