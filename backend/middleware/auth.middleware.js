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

module.exports = {
  getBearerToken,
  requireAuth,
  optionalAuth,
};
