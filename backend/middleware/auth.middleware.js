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

const pool = require("../config/database");

// ─── PHÂN QUYỀN: requireRole('admin') hoặc requireRole('admin', 'owner') ───
// Kiểm tra user có ít nhất 1 trong các role được phép.
// Phải gọi SAU requireAuth (vì cần req.auth).
// QUAN TRỌNG 1: Nếu không có quyền → trả 404 (giấu endpoint, như thể không tồn tại)
// thay vì 403 (lộ thông tin endpoint admin tồn tại).
// QUAN TRỌNG 2: LUÔN query database để lấy role thật (không phụ thuộc token cũ)
// → token cũ không chứa roles vẫn hoạt động đúng.
// LƯU Ý: KHÔNG được khai báo `async` ở hàm ngoài - vì nó phải TRẢ VỀ middleware function,
// nếu khai báo async thì nó trả về Promise → Express lỗi "argument handler is required".
function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    // 1. Query role THẬT từ DB theo user_id trong token
    let dbRoles = [];
    try {
      const roleResult = await pool.query(
        `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = $1`,
        [req.auth.sub],
      );
      dbRoles = roleResult.rows.map((row) => row.name);
    } catch (dbError) {
      console.error("❌ Lỗi query roles trong requireRole:", dbError.message);
      return res.status(500).json({ message: "Lỗi hệ thống." });
    }

    // Ghi đè roles từ DB vào req.auth để các middleware/controller sau dùng đúng
    req.auth.roles = dbRoles;

    // 2. So sánh role từ DB với role được phép
    const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());
    const hasRole = dbRoles.some((roleName) =>
      normalizedAllowed.includes(String(roleName).toLowerCase()),
    );

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
