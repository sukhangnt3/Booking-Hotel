// backend/controllers/promotion.controller.js
const crypto = require("crypto");
const pool = require("../config/database");
const { formatPromotion } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH KHUYẾN MÃI (KÈM LỌC HOTEL_ID) ───
async function listPromotions(req, res, next) {
  const hotelId = req.query.hotelId || req.query.hotel_id || null;

  try {
    const params = [];
    const where = [
      "p.is_active = true",
      "(p.start_date IS NULL OR p.start_date <= NOW())",
      "(p.end_date IS NULL OR p.end_date >= NOW())",
    ];

    if (hotelId) {
      params.push(hotelId);
      where.push(`(p.hotel_id IS NULL OR p.hotel_id = $${params.length})`);
    }

    const result = await pool.query(
      `SELECT
         p.id,
         p.hotel_id,
         h.name AS hotel_name,
         p.code,
         p.type,
         p.value,
         p.max_discount,
         p.min_order_value,
         p.start_date,
         p.end_date,
         p.usage_limit,
         p.is_active,
         p.created_at
       FROM public.promotion p
       LEFT JOIN public.hotel h ON h.id = p.hotel_id
       WHERE ${where.join(" AND ")}
       ORDER BY p.created_at DESC
       LIMIT 50`,
      params,
    );

    const formattedList = result.rows.map((r) =>
      typeof formatPromotion === "function" ? formatPromotion(r) : r,
    );

    return res.json({
      success: true,
      data: formattedList,
      promotions: formattedList,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ LỖI LIST_PROMOTIONS:", error);
    return next(error);
  }
}

// ─── 2. ƯU ĐÃI TOÀN SÀN DÀNH CHO TRANG PROMOTIONPAGE ───
async function getGlobalDeals(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         p.id,
         p.hotel_id,
         h.name AS hotel_name,
         p.code,
         p.type,
         p.value,
         p.max_discount,
         p.min_order_value,
         p.start_date,
         p.end_date,
         p.usage_limit,
         p.is_active,
         p.created_at
       FROM public.promotion p
       LEFT JOIN public.hotel h ON h.id = p.hotel_id
       WHERE p.is_active = true
         AND (p.end_date IS NULL OR p.end_date >= NOW())
       ORDER BY p.created_at DESC
       LIMIT 50`,
    );

    const formattedList = result.rows.map((r) => {
      const typeStr = String(r.type).toLowerCase();
      const isPercent = typeStr.includes("percent");

      return {
        id: r.id,
        code: r.code,
        title: `Mã ${r.code} - Giảm ${isPercent ? r.value + "%" : Number(r.value).toLocaleString("vi-VN") + " ₫"}`,
        description: r.hotel_name
          ? `Áp dụng đặc quyền cho cơ sở ${r.hotel_name}.`
          : "Áp dụng cho tất cả các khách sạn & resort trên toàn sàn GoStay.",
        discountType: isPercent ? "percentage" : "amount",
        discountValue: Number(r.value),
        minSpend: Number(r.min_order_value || 0),
        expiryDate: r.end_date
          ? new Date(r.end_date).toLocaleDateString("vi-VN")
          : "Không giới hạn",
        category: "summer",
        isHot: Number(r.value) >= 15 || Number(r.value) >= 100000,
      };
    });

    return res.json({
      success: true,
      data: formattedList,
      promotions: formattedList,
    });
  } catch (error) {
    console.error("❌ LỖI GET_GLOBAL_DEALS:", error);
    return res.json({ success: true, data: [] });
  }
}

// ─── 3. KIỂM TRA & TÍNH TIỀN GIẢM GIÁ ───
async function checkPromotionCode(req, res, next) {
  const { code, hotelId, totalAmount = 0 } = req.body || {};

  if (!code || !code.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng nhập mã ưu đãi." });
  }

  try {
    const cleanCode = code.trim().toUpperCase();
    const result = await pool.query(
      `SELECT * FROM public.promotion 
       WHERE UPPER(code) = $1 AND is_active = true
       LIMIT 1`,
      [cleanCode],
    );

    const promo = result.rows[0];
    if (!promo) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Mã khuyến mãi không tồn tại hoặc đã bị khóa.",
        });
    }

    const now = new Date();
    if (promo.start_date && new Date(promo.start_date) > now) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Chương trình ưu đãi này chưa bắt đầu.",
        });
    }
    if (promo.end_date && new Date(promo.end_date) < now) {
      return res
        .status(400)
        .json({ success: false, message: "Mã ưu đãi này đã hết hạn sử dụng." });
    }

    if (
      promo.hotel_id &&
      hotelId &&
      String(promo.hotel_id) !== String(hotelId)
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Mã ưu đãi này không áp dụng cho khách sạn hiện tại.",
        });
    }

    const orderPrice = Number(totalAmount);
    if (promo.min_order_value && orderPrice < Number(promo.min_order_value)) {
      return res.status(400).json({
        success: false,
        message: `Đơn phòng phải từ ${Number(promo.min_order_value).toLocaleString("vi-VN")} ₫ trở lên để dùng mã này.`,
      });
    }

    let discount = 0;
    const typeStr = String(promo.type).toLowerCase();
    const isPercent = typeStr.includes("percent");

    if (isPercent) {
      discount = Math.round((orderPrice * Number(promo.value)) / 100);
      if (promo.max_discount && discount > Number(promo.max_discount)) {
        discount = Number(promo.max_discount);
      }
    } else {
      discount = Number(promo.value);
    }

    const finalAmount = Math.max(0, orderPrice - discount);

    return res.json({
      success: true,
      isValid: true,
      promoId: promo.id,
      code: promo.code,
      discountAmount: discount,
      finalAmount: finalAmount,
      message: `✓ Áp dụng thành công! Đã giảm ${discount.toLocaleString("vi-VN")} ₫`,
    });
  } catch (error) {
    console.error("❌ LỖI CHECK_PROMO:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. TẠO MÃ KHUYẾN MÃI MỚI (DÀNH CHO CHỦ KHÁCH SẠN HOẶC ADMIN) ───
async function createPromotion(req, res, next) {
  const {
    hotel_id,
    code,
    type = "percentage",
    value,
    max_discount,
    min_order_value = 0,
    start_date,
    end_date,
    usage_limit = 100,
  } = req.body;

  if (!code || !value) {
    return res
      .status(400)
      .json({
        message: "Mã ưu đãi (code) và giá trị giảm (value) là bắt buộc.",
      });
  }

  try {
    // Tự động kiểm tra giá trị enum hợp lệ trong CSDL
    const enumRes = await pool.query(
      `SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'promotion_type_enum'`,
    );
    const validEnums = enumRes.rows.map((r) => r.enumlabel);

    let targetType = String(type).toLowerCase();
    if (targetType.includes("percent")) {
      targetType = validEnums.includes("percentage")
        ? "percentage"
        : validEnums[0];
    } else {
      targetType = validEnums.includes("amount")
        ? "amount"
        : validEnums.includes("fixed")
          ? "fixed"
          : validEnums[0];
    }

    const newPromoId = crypto.randomUUID();
    const cleanCode = code.trim().toUpperCase();

    const result = await pool.query(
      `INSERT INTO public.promotion (
         id, hotel_id, code, type, value, max_discount, min_order_value,
         start_date, end_date, usage_limit, is_active, created_at
       ) VALUES (
         $1, $2, $3, $4::public.promotion_type_enum, $5, $6, $7,
         $8, $9, $10, true, NOW()
       ) RETURNING *`,
      [
        newPromoId,
        hotel_id || null,
        cleanCode,
        targetType,
        Number(value),
        max_discount ? Number(max_discount) : null,
        Number(min_order_value || 0),
        start_date || new Date(),
        end_date || null,
        Number(usage_limit || 100),
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Tạo mã khuyến mãi thành công!",
      promotion: result.rows[0],
    });
  } catch (error) {
    console.error("❌ LỖI CREATE_PROMOTION:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 5. XÓA MÃ KHUYẾN MÃI ───
async function deletePromotion(req, res, next) {
  const { id } = req.params;
  try {
    await pool.query(
      `DELETE FROM public.promotion_usage WHERE promotion_id::text = $1`,
      [id],
    );
    const result = await pool.query(
      `DELETE FROM public.promotion WHERE id::text = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy mã khuyến mãi." });
    }

    return res.json({
      success: true,
      message: "Đã xóa mã khuyến mãi thành công.",
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listPromotions,
  getGlobalDeals,
  checkPromotionCode,
  createPromotion,
  deletePromotion,
};
