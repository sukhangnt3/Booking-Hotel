// backend/middleware/auth.middleware.js
const pool = require("../config/database");
const { verifyToken } = require("../utils/token");

function getBearerToken(req) {
  const authorization =
    req.headers.authorization || req.headers.Authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

// ─── 1. BẮT BUỘC ĐĂNG NHẬP ───
function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }

  req.auth = payload;
  req.user = {
    id: payload.sub || payload.id,
    userId: payload.sub || payload.id,
    email: payload.email,
    roles: payload.roles || [],
    ...payload,
  };
  req.userId = payload.sub || payload.id;

  return next();
}

// ─── 2. ĐĂNG NHẬP TÙY CHỌN ───
function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  if (payload) {
    req.auth = payload;
    req.user = {
      id: payload.sub || payload.id,
      userId: payload.sub || payload.id,
      email: payload.email,
      roles: payload.roles || [],
      ...payload,
    };
    req.userId = payload.sub || payload.id;
  } else {
    req.auth = null;
    req.user = null;
    req.userId = null;
  }

  return next();
}

// ─── 3. PHÂN QUYỀN TRUY VẤN THEO POSTGRESQL + TỰ ĐỘNG CẤP QUYỀN OWNER NẾU CÓ KHÁCH SẠN ───
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    const userId = req.user?.id || req.auth?.sub;

    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập." });
    }

    let dbRoles = [];
    try {
      const roleResult = await pool.query(
        `SELECT r.name
         FROM public.user_roles ur
         JOIN public.roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1::uuid`,
        [userId],
      );
      dbRoles = roleResult.rows.map((row) =>
        String(row.name).trim().toUpperCase(),
      );

      // 🌟 TỰ ĐỘNG CẤP QUYỀN OWNER NẾU USER SỞ HỮU KHÁCH SẠN
      const ownsHotel = await pool.query(
        `SELECT 1 FROM public.hotel WHERE owner_id::text = $1::text LIMIT 1`,
        [userId],
      );
      if (ownsHotel.rows.length > 0) {
        if (!dbRoles.includes("HOTEL_OWNER")) dbRoles.push("HOTEL_OWNER");
        if (!dbRoles.includes("OWNER")) dbRoles.push("OWNER");
      }
    } catch (dbError) {
      console.error("❌ Lỗi query roles trong requireRole:", dbError.message);
      return res.status(500).json({ message: "Lỗi hệ thống phân quyền." });
    }

    if (req.auth) req.auth.roles = dbRoles;
    if (req.user) req.user.roles = dbRoles;

    const normalizedAllowed = allowedRoles.map((r) =>
      String(r).trim().toUpperCase(),
    );

    const hasRole = dbRoles.some((roleName) => {
      if (normalizedAllowed.includes(roleName)) return true;
      if (
        normalizedAllowed.includes("OWNER") &&
        (roleName === "HOTEL_OWNER" || roleName === "OWNER")
      )
        return true;
      if (
        normalizedAllowed.includes("HOTEL_OWNER") &&
        (roleName === "HOTEL_OWNER" || roleName === "OWNER")
      )
        return true;
      if (normalizedAllowed.includes("ADMIN") && roleName === "ADMIN")
        return true;
      if (normalizedAllowed.includes("CUSTOMER") && roleName === "CUSTOMER")
        return true;
      return false;
    });

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền truy cập chức năng quản trị này.",
      });
    }

    return next();
  };
}

module.exports = {
  getBearerToken,
  requireAuth,
  optionalAuth,
  requireRole,
};
