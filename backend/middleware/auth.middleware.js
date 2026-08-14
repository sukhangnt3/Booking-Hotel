const { verifyToken } = require("../utils/token");

function getBearerToken(req) {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }

  req.auth = payload;
  return next();
}

// Middleware tùy chọn: nếu có token hợp lệ → set req.auth, nếu không → req.auth = null
// Dùng cho các endpoint công khai nhưng có thể trả thông tin cá nhân hóa (vd: is_favorite)
function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  const payload = verifyToken(token);

  req.auth = payload || null;
  return next();
}

// ─── PHÂN QUYỀN: requireRole('admin') hoặc requireRole('admin', 'owner') ───
// Kiểm tra user có ít nhất 1 trong các role được phép.
// Phải gọi SAU requireAuth (vì cần req.auth).
// QUAN TRỌNG: Nếu không có quyền → trả 404 (giấu endpoint, như thể không tồn tại)
// thay vì 403 (lộ thông tin endpoint admin tồn tại).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.auth?.roles || [];

    // Chuẩn hóa: chuyển tất cả về chữ thường
    const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());
    const hasRole = userRoles.some((r) => {
      const roleStr = String(r?.name || r || "").toLowerCase();
      return normalizedAllowed.includes(roleStr);
    });

    if (!hasRole) {
      // Trả 404 giống như endpoint không tồn tại → ẩn hoàn toàn khỏi non-admin
      return res.status(404).json({
        message: "Không tìm thấy tài nguyên.",
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
