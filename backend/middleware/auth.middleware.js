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

module.exports = {
  getBearerToken,
  requireAuth,
};
