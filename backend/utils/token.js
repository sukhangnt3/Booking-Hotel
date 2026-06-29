const crypto = require("crypto");

function getJwtSecret() {
  return process.env.JWT_SECRET || "local-development-secret";
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  })).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(payload)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length
    || !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    if (!data.sub || !data.exp || Date.now() > data.exp) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

module.exports = {
  createToken,
  verifyToken,
};
