const crypto = require("crypto");
const querystring = require("qs");
const pool = require("../config/database");

const VNPAY_TMN_CODE =
  process.env.VNPAY_TMN_CODE || process.env.VNP_TMNCODE || "2QXA4YG2";
const VNPAY_HASH_SECRET =
  process.env.VNPAY_HASH_SECRET ||
  process.env.VNP_HASHSECRET ||
  "RA4A1EBC5Y78Y1XME8M13UFE5I540A6G";
const VNPAY_URL =
  process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_URL =
  process.env.VNPAY_RETURN_URL ||
  "http://localhost:5000/api/payments/vnpay-return";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// HÀM SẮP XẾP OBJECT AN TOÀN KHI NHẬN REQ.QUERY TỪ EXPRESS
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

// Hàm lấy ngày giờ thực tế chuẩn YYYYMMDDHHmmss
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

function buildVnpayUrl({ bookingCode, amount, orderInfo, ipAddr }) {
  const createDate = getVnpayCreateDate();
  const txnRef = `${bookingCode}_${Date.now()}`;

  // Dùng 10,000 VNĐ để test Sandbox
  const testAmount = 10000;

  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = VNPAY_TMN_CODE;
  vnp_Params["vnp_Locale"] = "vn";
  vnp_Params["vnp_CurrCode"] = "VND";
  vnp_Params["vnp_TxnRef"] = txnRef;
  vnp_Params["vnp_OrderInfo"] =
    orderInfo || `Thanh toan don hang ${bookingCode}`;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = testAmount * 100;
  vnp_Params["vnp_ReturnUrl"] = VNPAY_RETURN_URL;
  vnp_Params["vnp_IpAddr"] = ipAddr || "127.0.0.1";
  vnp_Params["vnp_CreateDate"] = createDate;

  vnp_Params = sortObject(vnp_Params);

  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
  let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;

  const sanitizedBase = String(VNPAY_URL)
    .replace("sandbox.vnpay.vn", "sandbox.vnpayment.vn")
    .replace("vnpay.vn", "vnpayment.vn");

  return `${sanitizedBase}?${querystring.stringify(vnp_Params, { encode: false })}`;
}

async function createVnpayUrl(req, res) {
  try {
    const { bookingCode, amount, orderInfo } = req.body || {};
    if (!bookingCode || !amount) {
      return res
        .status(400)
        .json({ message: "bookingCode và amount là bắt buộc." });
    }

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price FROM booking
       WHERE (booking_code = $1 OR id::text = $1)
       LIMIT 1`,
      [bookingCode],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy đơn đặt phòng trong Database." });
    }

    const rawAmount = Number(amount) || Number(booking.total_price) || 0;
    const finalAmount = Math.round(rawAmount);

    const rawIpAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const ipAddr =
      rawIpAddr && rawIpAddr.includes(":") ? "127.0.0.1" : rawIpAddr;

    const vnpayUrl = buildVnpayUrl({
      bookingCode: booking.booking_code,
      amount: finalAmount,
      orderInfo: orderInfo || `Thanh toan don hang ${booking.booking_code}`,
      ipAddr,
    });

    console.log("[VNPay Success URL]:", vnpayUrl);

    try {
      await pool.query(
        `INSERT INTO payment (booking_id, payment_method, expected_amount, status, created_at)
         VALUES ($1, 'VNPay', $2, 'pending'::payment_status_enum, NOW()) ON CONFLICT DO NOTHING`,
        [booking.id, finalAmount],
      );
    } catch (paymentError) {
      console.warn("Lưu ý (bảng payment):", paymentError.message);
    }

    return res.json({
      vnpayUrl,
      paymentUrl: vnpayUrl,
      bookingCode: booking.booking_code,
      amount: finalAmount,
    });
  } catch (error) {
    console.error("❌ [LỖI BACKEND]:", error.message);
    return res
      .status(500)
      .json({ message: "Lỗi Server", errorDetail: error.message });
  }
}

async function vnpayReturn(req, res) {
  try {
    let vnp_Params = { ...req.query };
    let secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const responseCode = vnp_Params["vnp_ResponseCode"];
    const bookingCode = (vnp_Params["vnp_TxnRef"] || "").split("_")[0];

    // Trường hợp thanh toán THÀNH CÔNG (ResponseCode == '00')
    if (secureHash === signed && responseCode === "00" && bookingCode) {
      await pool.query(
        `UPDATE booking SET payment_status = 'paid'::booking_payment_status_enum, status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
         WHERE booking_code = $1`,
        [bookingCode],
      );
      console.log(`✅ [THANH TOÁN THÀNH CÔNG] Đơn hàng ${bookingCode}`);
      return res.redirect(
        `${FRONTEND_URL}/booking-success?success=true&code=${bookingCode}`,
      );
    }

    // Trường hợp NGƯỜI DÙNG BẤM HỦY HOẶC QUAY LẠI
    console.warn(
      `⚠️ Thanh toán VNPay không thành công hoặc bị hủy (Code: ${responseCode})`,
    );
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&code=${bookingCode}&message=cancelled`,
    );
  } catch (error) {
    console.error("[vnpayReturn Error]:", error.message);
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&message=error`,
    );
  }
}

module.exports = { createVnpayUrl, vnpayReturn };
