require("dotenv").config();
const crypto = require("crypto");
const querystring = require("qs");
const pool = require("../config/database");

// ─── 1. ĐỌC CẤU HÌNH BẢO MẬT TỪ BIẾN MÔI TRƯỜNG (.ENV) ───
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE;
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET;
const VNPAY_URL =
  process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const VNPAY_RETURN_URL =
  process.env.VNPAY_RETURN_URL ||
  "http://localhost:5000/api/payments/vnpay-return";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Cảnh báo ngay trong Terminal nếu chưa cấu hình .env
if (!VNPAY_TMN_CODE || !VNPAY_HASH_SECRET) {
  console.error(
    "❌ [SECURITY WARNING]: Thiếu VNPAY_TMN_CODE hoặc VNPAY_HASH_SECRET trong file .env!",
  );
}

// ─── 2. HÀM BỔ TRỢ: SẮP XẾP PARAMS THEO CHUẨN VNPAY ───
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

// ─── 3. HÀM TẠO CHUỖI NGÀY GIỜ YYYYMMDDHHMMSS ───
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

// ─── 4. HÀM XÂY DỰNG URL VNPAY KÈM CHỮ KÝ HMAC SHA512 ───
function buildVnpayUrl({ bookingCode, amount, orderInfo, ipAddr }) {
  const createDate = getVnpayCreateDate();
  const txnRef = `${bookingCode}_${Date.now()}`;

  // VNPay yêu cầu số tiền nhân 100 (Ví dụ: 100.000 VNĐ -> 10000000)
  const finalVnpAmount = Math.round(Number(amount)) * 100;

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
  vnp_Params["vnp_Amount"] = finalVnpAmount;
  vnp_Params["vnp_ReturnUrl"] = VNPAY_RETURN_URL;
  vnp_Params["vnp_IpAddr"] = ipAddr || "127.0.0.1";
  vnp_Params["vnp_CreateDate"] = createDate;

  // Sắp xếp các tham số từ A đến Z trước khi ký
  vnp_Params = sortObject(vnp_Params);

  const signData = querystring.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;

  const sanitizedBase = String(VNPAY_URL)
    .replace("sandbox.vnpay.vn", "sandbox.vnpayment.vn")
    .replace("vnpay.vn", "vnpayment.vn");

  return `${sanitizedBase}?${querystring.stringify(vnp_Params, { encode: false })}`;
}

// ─── 5. API TẠO LINK THANH TOÁN (POST /api/payments/create-vnpay-url) ───
async function createVnpayUrl(req, res) {
  try {
    const { bookingCode, amount, orderInfo } = req.body || {};
    if (!bookingCode || !amount) {
      return res
        .status(400)
        .json({ message: "bookingCode và amount là bắt buộc." });
    }

    // 1. Kiểm tra đơn đặt phòng có tồn tại trong Database không
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

    // 2. Lấy IP an toàn của khách hàng
    const rawIpAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const ipAddr =
      rawIpAddr && rawIpAddr.includes(":") ? "127.0.0.1" : rawIpAddr;

    // 3. Tạo đường dẫn VNPay
    const vnpayUrl = buildVnpayUrl({
      bookingCode: booking.booking_code,
      amount: finalAmount,
      orderInfo: orderInfo || `Thanh toan don hang ${booking.booking_code}`,
      ipAddr,
    });

    console.log("🔗 [VNPay Payment URL]:", vnpayUrl);

    // 4. Lưu giao dịch pending vào bảng payment
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

// ─── 6. API XỬ LÝ KẾT QUẢ VNPAY TRẢ VỀ (GET /api/payments/vnpay-return) ───
async function vnpayReturn(req, res) {
  try {
    let vnp_Params = { ...req.query };
    const secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // Sắp xếp tham số trước khi đối soát chữ ký
    vnp_Params = sortObject(vnp_Params);

    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", VNPAY_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    const responseCode = vnp_Params["vnp_ResponseCode"];
    const bookingCode = (vnp_Params["vnp_TxnRef"] || "").split("_")[0];
    const amount = Number(vnp_Params["vnp_Amount"] || 0) / 100;

    // ─── A. THANH TOÁN THÀNH CÔNG (ResponseCode === '00' VÀ HỢP LỆ CHỮ KÝ) ───
    if (secureHash === signed && responseCode === "00" && bookingCode) {
      // 1. Cập nhật trạng thái đơn đặt phòng sang 'confirmed' & 'paid'
      await pool.query(
        `UPDATE booking 
         SET payment_status = 'paid'::booking_payment_status_enum, 
             status = 'confirmed', 
             confirmed_at = NOW(), 
             updated_at = NOW()
         WHERE booking_code = $1`,
        [bookingCode],
      );

      // 2. Cập nhật trạng thái bảng payment sang 'paid'
      try {
        await pool.query(
          `UPDATE payment 
           SET status = 'paid'::payment_status_enum, 
               updated_at = NOW()
           WHERE booking_id = (SELECT id FROM booking WHERE booking_code = $1 LIMIT 1)`,
          [bookingCode],
        );
      } catch (err) {}

      console.log(
        `✅ [THANH TOÁN THÀNH CÔNG] Đơn hàng: ${bookingCode} - Số tiền: ${amount.toLocaleString("vi-VN")}đ`,
      );
      return res.redirect(
        `${FRONTEND_URL}/booking-success?success=true&code=${bookingCode}&amount=${amount}`,
      );
    }

    // ─── B. NGƯỜI DÙNG BẤM HỦY HOẶC GIAO DỊCH THẤT BẠI ───
    console.warn(
      `⚠️ Thanh toán VNPay không thành công (ResponseCode: ${responseCode})`,
    );
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&code=${bookingCode}&amount=${amount}&message=cancelled`,
    );
  } catch (error) {
    console.error("❌ [vnpayReturn Error]:", error.message);
    return res.redirect(
      `${FRONTEND_URL}/booking-success?success=false&message=error`,
    );
  }
}

module.exports = { createVnpayUrl, vnpayReturn };
