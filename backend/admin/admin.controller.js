// backend/admin/admin.controller.js (hoặc controllers/admin.controller.js)
const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// ─── 1. THỐNG KÊ DASHBOARD QUẢN TRỊ ───
async function getStats(req, res, next) {
  try {
    const dbStart = Date.now();
    await pool.query("SELECT 1");
    const dbLatency = Date.now() - dbStart;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const [
      userCount,
      bookingCount,
      hotelCount,
      revenueResult,
      pendingHotelCount,
      trafficResult,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS count FROM public.users WHERE activate = true`,
      ),
      pool.query(`SELECT COUNT(*)::int AS count FROM public.booking`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM public.hotel WHERE status = 'active'`,
      ),
      pool.query(
        `SELECT 
           COALESCE(SUM(b.total_price), 0)::bigint AS gmv,
           COALESCE(SUM(b.total_price * COALESCE(h.commission_rate, 18) / 100.0), 0)::bigint AS commission_revenue
         FROM public.booking b
         JOIN public.hotel h ON h.id = b.hotel_id
         WHERE b.status IN ('confirmed', 'checked_in', 'checked_out') 
            OR b.payment_status = 'paid'`,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM public.hotel WHERE status = 'pending'`,
      ),
      pool.query(`
        WITH time_slots AS (
          SELECT generate_series(
            DATE_TRUNC('day', NOW()),
            DATE_TRUNC('day', NOW()) + INTERVAL '21 hours',
            INTERVAL '3 hours'
          ) AS slot
        )
        SELECT 
          TO_CHAR(ts.slot, 'HH24:00') AS time,
          COUNT(rl.id)::int AS requests
        FROM time_slots ts
        LEFT JOIN public.request_logs rl 
          ON rl.created_at >= ts.slot 
         AND rl.created_at < ts.slot + INTERVAL '3 hours'
        GROUP BY ts.slot
        ORDER BY ts.slot ASC
      `),
    ]);

    const statsData = {
      totalUsers: userCount.rows[0]?.count || 0,
      totalBookings: bookingCount.rows[0]?.count || 0,
      totalHotels: hotelCount.rows[0]?.count || 0,
      totalGMV: Number(revenueResult.rows[0]?.gmv || 0),
      totalRevenue: Number(revenueResult.rows[0]?.commission_revenue || 0),
      pendingHotels: pendingHotelCount.rows[0]?.count || 0,
      hourlyTraffic: trafficResult.rows,
      dbLatency: `${dbLatency}ms`,
      serverUptime: uptimeFormatted,
    };

    return res.json({
      success: true,
      data: statsData,
      ...statsData,
    });
  } catch (error) {
    console.error("❌ LỖI GET_STATS:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 2. DANH SÁCH NGƯỜI DÙNG ───
async function listUsers(req, res, next) {
  try {
    let search = (req.query.search || "").toString().trim();
    const params = [];
    let where = "";

    if (search && search !== "undefined" && search !== "null") {
      params.push(`%${search}%`);
      where = `WHERE (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)`;
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.phone,
         u.dob,
         u.avatar,
         u.activate,
         u.email_verified,
         u.phone_verified,
         u.last_login,
         u.created_at,
         u.updated_at,
         COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM public.users u
       LEFT JOIN public.user_roles ur ON ur.user_id = u.id
       LEFT JOIN public.roles r ON r.id = ur.role_id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      success: true,
      data: result.rows,
      users: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ LỖI LIST_USERS:", error);
    return next(error);
  }
}

// ─── 3. TẠO TÀI KHOẢN MỚI ───
async function createUser(req, res, next) {
  const { full_name, email, phone, password, role } = req.body;

  if (!full_name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng điền đủ Tên, Email và Mật khẩu." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkEmail = await client.query(
      `SELECT id FROM public.users WHERE email = $1`,
      [email.toLowerCase().trim()],
    );
    if (checkEmail.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userInsert = await client.query(
      `INSERT INTO public.users (id, full_name, email, password, phone, activate, email_verified, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, true, NOW(), NOW())
       RETURNING id, full_name, email`,
      [
        full_name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        phone ? phone.trim() : null,
      ],
    );

    const newUserId = userInsert.rows[0].id;
    let assignedRole = (role || "CUSTOMER").toUpperCase();

    let roleRes = await client.query(
      `SELECT id FROM public.roles WHERE UPPER(name) = $1`,
      [assignedRole],
    );
    let roleId;
    if (roleRes.rows.length > 0) {
      roleId = roleRes.rows[0].id;
    } else {
      const newR = await client.query(
        `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), $1) RETURNING id`,
        [assignedRole],
      );
      roleId = newR.rows[0].id;
    }

    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [newUserId, roleId],
    );

    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công.",
      user: userInsert.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI CREATE_USER:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 4. CẬP NHẬT ROLE ───
async function updateUserRole(req, res, next) {
  const userId = req.params.id;
  let newRole = (req.body.role || "").toString().trim().toUpperCase();

  if (!userId || !newRole) {
    return res.status(400).json({ message: "userId và role là bắt buộc." });
  }

  if (newRole === "OWNER") newRole = "HOTEL_OWNER";
  if (newRole === "GUEST") newRole = "CUSTOMER";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let roleResult = await client.query(
      `SELECT id FROM public.roles WHERE UPPER(name) = $1`,
      [newRole],
    );
    let roleId;
    if (roleResult.rows.length > 0) {
      roleId = roleResult.rows[0].id;
    } else {
      const newRoleRes = await client.query(
        `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), $1) RETURNING id`,
        [newRole],
      );
      roleId = newRoleRes.rows[0].id;
    }

    await client.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [
      userId,
    ]);
    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1, $2)`,
      [userId, roleId],
    );

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: `Đã cập nhật vai trò sang ${newRole}.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 5. KHÓA / MỞ KHÓA TÀI KHOẢN ───
async function toggleUserStatus(req, res, next) {
  const userId = req.params.id;
  try {
    const result = await pool.query(
      `UPDATE public.users
       SET activate = NOT activate, updated_at = NOW()
       WHERE id = $1
       RETURNING id, activate`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    return res.json({
      success: true,
      message: result.rows[0].activate
        ? "Đã mở khóa tài khoản."
        : "Đã khóa tài khoản.",
      activate: result.rows[0].activate,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 6. DUYỆT KHÁCH SẠN ───
async function listAdminHotels(req, res, next) {
  try {
    let status = (req.query.status || "").toString().trim();
    const params = [];
    let where = "WHERE 1=1";

    if (status === "approved") status = "active";

    if (status && status !== "all") {
      params.push(status);
      where += ` AND h.status = $1::public.hotel_status_enum`;
    }

    const result = await pool.query(
      `SELECT
         h.*,
         u.full_name AS owner_name,
         u.email AS owner_email,
         u.phone AS owner_phone,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             WHERE img.hotel_id = h.id 
             ORDER BY img.is_thumbnail DESC, img.display_order ASC 
             LIMIT 1
           ),
           'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
         ) AS thumbnail
       FROM public.hotel h
       LEFT JOIN public.users u ON u.id = h.owner_id
       ${where}
       ORDER BY h.created_at DESC`,
      params,
    );

    return res.json({
      success: true,
      data: result.rows,
      hotels: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ LỖI LIST_ADMIN_HOTELS:", error);
    return next(error);
  }
}

async function updateHotelStatus(req, res, next) {
  const hotelId = req.params.id;
  let status = (req.body.status || "").toString().trim();
  const rejectionReason = req.body.rejection_reason || null;

  if (status === "approved") status = "active";

  try {
    const result = await pool.query(
      `UPDATE public.hotel
       SET status = $1::public.hotel_status_enum,
           rejection_reason = CASE WHEN $1::public.hotel_status_enum = 'rejected' THEN $2 ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, status, rejection_reason`,
      [status, rejectionReason, hotelId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái khách sạn sang [${status}].`,
      hotel: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 7. GIÁM SÁT ĐƠN ĐẶT PHÒNG TOÀN SÀN ───
async function listAllBookings(req, res, next) {
  try {
    const status = (req.query.status || "").toString().trim();
    const params = [];
    let where = "";

    if (status && status !== "all") {
      params.push(status);
      where = `WHERE b.status = $1::public.booking_status_enum`;
    }

    const result = await pool.query(
      `SELECT
         b.*,
         h.name AS hotel_name,
         p.payment_method,
         p.paid_amount
       FROM public.booking b
       JOIN public.hotel h ON h.id = b.hotel_id
       LEFT JOIN public.payment p ON p.booking_id = b.id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT 200`,
      params,
    );

    return res.json({
      success: true,
      data: result.rows,
      bookings: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateBookingStatusAdmin(req, res, next) {
  const bookingId = req.params.id;
  const status = (req.body.status || "").toString().trim();

  try {
    const result = await pool.query(
      `UPDATE public.booking
       SET status = $1::public.booking_status_enum,
           confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE confirmed_at END,
           cancelled_at = CASE WHEN $1 = 'cancelled' THEN NOW() ELSE cancelled_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, status`,
      [status, bookingId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    return res.json({
      success: true,
      message: `Đã cập nhật trạng thái đơn sang ${status}.`,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 8. PROMOTIONS & REVIEWS DÀNH CHO ADMIN ───
async function listPromotions(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT p.*, h.name AS hotel_name 
       FROM public.promotion p 
       LEFT JOIN public.hotel h ON h.id = p.hotel_id 
       ORDER BY p.created_at DESC`,
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function listReviews(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name AS user_name, h.name AS hotel_name
       FROM public.review r
       LEFT JOIN public.users u ON u.id = r.user_id
       LEFT JOIN public.hotel h ON h.id = r.hotel_id
       ORDER BY r.created_at DESC`,
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
}

async function deleteReview(req, res, next) {
  try {
    await pool.query(`DELETE FROM public.review WHERE id = $1`, [
      req.params.id,
    ]);
    return res.json({ success: true, message: "Đã xóa đánh giá vi phạm." });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getStats,
  listUsers,
  createUser,
  updateUserRole,
  toggleUserStatus,
  listAdminHotels,
  updateHotelStatus,
  listAllBookings,
  updateBookingStatusAdmin,
  listPromotions,
  listReviews,
  deleteReview,
};
