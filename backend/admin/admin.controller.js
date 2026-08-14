const pool = require("../config/database");
const { formatUser, formatBooking, formatHotel } = require("../utils/formatters");

// ─────────────────────────────────────────────
//  DASHBOARD - Thống kê tổng quan
// ─────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    const [userCount, bookingCount, hotelCount, revenueResult, pendingHotelCount] =
      await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE activate = true`),
        pool.query(`SELECT COUNT(*)::int AS count FROM booking`),
        pool.query(`SELECT COUNT(*)::int AS count FROM hotel WHERE deleted_at IS NULL`),
        pool.query(
          `SELECT COALESCE(SUM(total_price), 0)::int AS revenue
           FROM booking
           WHERE status IN ('confirmed', 'checked_in', 'checked_out', 'completed')`,
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM hotel WHERE status = 'pending' AND deleted_at IS NULL`,
        ),
      ]);

    return res.json({
      data: {
        totalUsers: userCount.rows[0].count,
        totalBookings: bookingCount.rows[0].count,
        totalHotels: hotelCount.rows[0].count,
        totalRevenue: revenueResult.rows[0].revenue,
        pendingHotels: pendingHotelCount.rows[0].count,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// ─────────────────────────────────────────────
//  USERS - Quản lý người dùng
// ─────────────────────────────────────────────
async function listUsers(req, res, next) {
  try {
    const search = (req.query.search || "").toString().trim();
    const params = [];
    let where = "";

    if (search) {
      params.push(`%${search}%`);
      where = `WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1)`;
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.activate,
         u.created_at,
         COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 100`,
      params,
    );

    const users = result.rows.map(formatUser);

    return res.json({ data: users, users, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  const userId = req.params.id;
  const newRole = (req.body.role || req.body.role_name || "").toString().trim().toLowerCase();

  if (!userId || !newRole) {
    return res.status(400).json({ message: "userId và role là bắt buộc." });
  }

  const allowedRoles = ["admin", "owner", "customer", "guest"];
  if (!allowedRoles.includes(newRole)) {
    return res.status(400).json({ message: `Role không hợp lệ. Chỉ chấp nhận: ${allowedRoles.join(", ")}` });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Tìm role id
    const roleResult = await client.query(
      `SELECT id FROM roles WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [newRole],
    );

    let roleId;
    if (roleResult.rows[0]) {
      roleId = roleResult.rows[0].id;
    } else {
      // Tạo role mới nếu chưa tồn tại
      const newRoleResult = await client.query(
        `INSERT INTO roles (name) VALUES ($1) RETURNING id`,
        [newRole],
      );
      roleId = newRoleResult.rows[0].id;
    }

    // Xóa tất cả role hiện tại của user (trừ admin - không cho tự hạ admin)
    await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);

    // Gán role mới
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [userId, roleId],
    );

    await client.query("COMMIT");

    return res.json({ message: `Đã cập nhật vai trò thành ${newRole}.` });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

async function toggleUserStatus(req, res, next) {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "userId là bắt buộc." });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET activate = NOT activate, updated_at = NOW()
       WHERE id = $1
       RETURNING id, activate`,
      [userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.json({
      message: result.rows[0].activate ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.",
      activate: result.rows[0].activate,
    });
  } catch (error) {
    return next(error);
  }
}

// ─────────────────────────────────────────────
//  BOOKINGS - Quản lý đơn đặt phòng
// ─────────────────────────────────────────────
async function listAllBookings(req, res, next) {
  try {
    const status = (req.query.status || "").toString().trim();
    const params = [];
    let where = "";

    if (status) {
      params.push(status);
      where = `WHERE b.status = $1::booking_status_enum`;
    }

    const result = await pool.query(
      `SELECT
         b.id,
         b.booking_code,
         b.user_id,
         b.hotel_id,
         h.name AS hotel_name,
         u.full_name AS customer_name,
         u.email AS guest_email,
         b.checkin_date,
         b.checkout_date,
         b.adult_total,
         b.children_total,
         b.status,
         b.payment_status,
         b.subtotal,
         b.discount,
         b.tax,
         b.service_total,
         b.total_price,
         b.created_at
       FROM booking b
       JOIN hotel h ON h.id = b.hotel_id
       LEFT JOIN users u ON u.id = b.user_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT 200`,
      params,
    );

    const bookings = result.rows.map(formatBooking);

    return res.json({ data: bookings, bookings, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatusAdmin(req, res, next) {
  const bookingId = req.params.id;
  const status = (req.body.status || "").toString().trim();

  if (!bookingId || !status) {
    return res.status(400).json({ message: "bookingId và status là bắt buộc." });
  }

  const allowedStatuses = ["pending", "pending_payment", "confirmed", "checked_in", "checked_out", "completed", "cancelled", "no_show"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Status không hợp lệ. Chỉ chấp nhận: ${allowedStatuses.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE booking
       SET status = $1::booking_status_enum,
           confirmed_at = CASE WHEN $1 = 'confirmed' THEN COALESCE(confirmed_at, NOW()) ELSE confirmed_at END,
           cancelled_at = CASE WHEN $1 = 'cancelled' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [status, bookingId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({ message: `Đã cập nhật trạng thái đơn thành ${status}.` });
  } catch (error) {
    return next(error);
  }
}

// ─────────────────────────────────────────────
//  HOTELS - Duyệt / quản lý khách sạn
// ─────────────────────────────────────────────
async function listAdminHotels(req, res, next) {
  try {
    const status = (req.query.status || "").toString().trim();
    const params = [];
    let where = "h.deleted_at IS NULL";

    if (status) {
      params.push(status);
      where += ` AND h.status = $1::hotel_status_enum`;
    }

    const result = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.address,
         h.city,
         h.star_rating,
         h.status,
         h.average_rating,
         h.review_count,
         h.owner_id,
         u.full_name AS owner_name,
         u.email AS owner_email,
         thumb.path AS thumbnail,
         h.created_at
       FROM hotel h
       LEFT JOIN users u ON u.id = h.owner_id
       LEFT JOIN image thumb ON thumb.hotel_id = h.id AND thumb.is_thumbnail = true
       WHERE ${where}
       ORDER BY h.created_at DESC
       LIMIT 200`,
      params,
    );

    const hotels = result.rows.map((hotel) => ({
      ...formatHotel(hotel),
      ownerName: hotel.owner_name,
      owner_name: hotel.owner_name,
      ownerEmail: hotel.owner_email,
      owner_email: hotel.owner_email,
      status: hotel.status,
    }));

    return res.json({ data: hotels, hotels, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function updateHotelStatus(req, res, next) {
  const hotelId = req.params.id;
  const status = (req.body.status || req.params.status || "").toString().trim();

  if (!hotelId || !status) {
    return res.status(400).json({ message: "hotelId và status là bắt buộc." });
  }

  const allowedStatuses = ["pending", "approved", "rejected", "suspended"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: `Status không hợp lệ. Chỉ chấp nhận: ${allowedStatuses.join(", ")}` });
  }

  try {
    const result = await pool.query(
      `UPDATE hotel
       SET status = $1::hotel_status_enum, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [status, hotelId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    const statusText = {
      approved: "đã được duyệt",
      rejected: "đã bị từ chối",
      suspended: "đã bị tạm khóa",
      pending: "đang chờ duyệt",
    }[status];

    return res.json({ message: `Khách sạn ${statusText}.` });
  } catch (error) {
    return next(error);
  }
}

// ─────────────────────────────────────────────
//  PROMOTIONS - Quản lý khuyến mãi
// ─────────────────────────────────────────────
async function listPromotions(req, res, next) {
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
       FROM promotion p
       LEFT JOIN hotel h ON h.id = p.hotel_id
       ORDER BY p.created_at DESC
       LIMIT 200`,
    );

    return res.json({ data: result.rows, promotions: result.rows, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function createPromotion(req, res, next) {
  const {
    hotelId,
    code,
    type,
    value,
    maxDiscount,
    minOrderValue,
    startDate,
    endDate,
    usageLimit,
    isActive,
  } = req.body;

  if (!code || !type || value === undefined) {
    return res.status(400).json({ message: "code, type và value là bắt buộc." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO promotion (
         hotel_id, code, type, value, max_discount, min_order_value,
         start_date, end_date, usage_limit, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3::promotion_type_enum, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id`,
      [
        hotelId || null,
        code.trim(),
        type,
        Number(value),
        maxDiscount ? Number(maxDiscount) : null,
        minOrderValue ? Number(minOrderValue) : null,
        startDate || null,
        endDate || null,
        usageLimit ? Number(usageLimit) : null,
        isActive !== undefined ? Boolean(isActive) : true,
      ],
    );

    return res.status(201).json({ message: "Đã tạo khuyến mãi.", id: result.rows[0].id });
  } catch (error) {
    return next(error);
  }
}

async function updatePromotion(req, res, next) {
  const promotionId = req.params.id;
  const {
    hotelId,
    code,
    type,
    value,
    maxDiscount,
    minOrderValue,
    startDate,
    endDate,
    usageLimit,
    isActive,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE promotion
       SET hotel_id = COALESCE($1, hotel_id),
           code = COALESCE($2, code),
           type = COALESCE($3::promotion_type_enum, type),
           value = COALESCE($4, value),
           max_discount = COALESCE($5, max_discount),
           min_order_value = COALESCE($6, min_order_value),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           usage_limit = COALESCE($9, usage_limit),
           is_active = COALESCE($10, is_active),
           updated_at = NOW()
       WHERE id = $11
       RETURNING id`,
      [
        hotelId || null,
        code || null,
        type || null,
        value !== undefined ? Number(value) : null,
        maxDiscount !== undefined ? Number(maxDiscount) : null,
        minOrderValue !== undefined ? Number(minOrderValue) : null,
        startDate || null,
        endDate || null,
        usageLimit !== undefined ? Number(usageLimit) : null,
        isActive !== undefined ? Boolean(isActive) : null,
        promotionId,
      ],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi." });
    }

    return res.json({ message: "Đã cập nhật khuyến mãi." });
  } catch (error) {
    return next(error);
  }
}

async function deletePromotion(req, res, next) {
  const promotionId = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM promotion WHERE id = $1 RETURNING id`,
      [promotionId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy khuyến mãi." });
    }

    return res.json({ message: "Đã xóa khuyến mãi." });
  } catch (error) {
    return next(error);
  }
}

// ─────────────────────────────────────────────
//  REVIEWS - Quản lý đánh giá
// ─────────────────────────────────────────────
async function listReviews(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         rv.id,
         rv.user_id,
         u.full_name AS user_name,
         rv.hotel_id,
         h.name AS hotel_name,
         rv.booking_id,
         rv.description,
         rv.point,
         rv.reply,
         rv.created_at
       FROM review rv
       LEFT JOIN users u ON u.id = rv.user_id
       LEFT JOIN hotel h ON h.id = rv.hotel_id
       ORDER BY rv.created_at DESC
       LIMIT 200`,
    );

    return res.json({ data: result.rows, reviews: result.rows, total: result.rowCount });
  } catch (error) {
    return next(error);
  }
}

async function deleteReview(req, res, next) {
  const reviewId = req.params.id;

  try {
    const result = await pool.query(
      `DELETE FROM review WHERE id = $1 RETURNING id`,
      [reviewId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá." });
    }

    return res.json({ message: "Đã xóa đánh giá." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStats,
  listUsers,
  updateUserRole,
  toggleUserStatus,
  listAllBookings,
  updateBookingStatusAdmin,
  listAdminHotels,
  updateHotelStatus,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listReviews,
  deleteReview,
};