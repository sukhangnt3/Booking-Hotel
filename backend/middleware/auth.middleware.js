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

// ─── 1. BẮT BUỘC ĐĂNG NHẬP (REQUIRE AUTH) ───
function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }

  // Đồng bộ sang cả req.auth, req.user và req.userId để tương thích 100% mọi controller
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

// ─── 2. ĐĂNG NHẬP TÙY CHỌN (OPTIONAL AUTH) ───
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

// ─── 3. PHÂN QUYỀN TRUY VẤN THEO BẢNG ROLES CỦA POSTGRESQL ───
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
         WHERE ur.user_id = $1`,
        [userId],
      );
      dbRoles = roleResult.rows.map((row) =>
        String(row.name).trim().toUpperCase(),
      );
    } catch (dbError) {
      console.error("❌ Lỗi query roles trong requireRole:", dbError.message);
      return res.status(500).json({ message: "Lỗi hệ thống phân quyền." });
    }

    // Cập nhật lại roles mới nhất từ CSDL vào req
    if (req.auth) req.auth.roles = dbRoles;
    if (req.user) req.user.roles = dbRoles;

    // Chuẩn hóa danh sách quyền được phép
    const normalizedAllowed = allowedRoles.map((r) =>
      String(r).trim().toUpperCase(),
    );

    // Kiểm tra tương thích linh hoạt:
    // Ví dụ: route yêu cầu 'OWNER', trong CSDL là 'HOTEL_OWNER' vẫn chấp nhận hợp lệ
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
