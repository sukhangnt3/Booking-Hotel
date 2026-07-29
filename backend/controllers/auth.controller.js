const crypto = require("crypto");
const pool = require("../config/database");
const { createToken } = require("../utils/token");
const { formatUser } = require("../utils/formatters");

async function loadUserWithRoles(userId) {
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
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId],
  );

  return result.rows[0] || null;
}

async function ensureCustomerRole(client) {
  const result = await client.query(
    `INSERT INTO roles (name)
     VALUES ('customer')
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );

  return result.rows[0].id;
}

async function createGooglePasswordHash() {
  return `google$${crypto.randomBytes(16).toString("hex")}$${crypto.randomBytes(32).toString("hex")}`;
}

function buildAuthResponse(user) {
  const token = createToken(user);

  return {
    message: "Đăng nhập thành công.",
    token,
    systemToken: token,
    user: formatUser(user),
  };
}

async function getGoogleProfile(accessToken) {
  if (typeof fetch !== "function") {
    throw new Error("Môi trường hiện tại không hỗ trợ xác thực Google.");
  }

  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Token Google không hợp lệ.");
  }

  const profile = await response.json();

  if (String(profile.email_verified).toLowerCase() !== "true") {
    throw new Error("Tài khoản Google chưa được xác thực email.");
  }

  if (!profile.email) {
    throw new Error("Không lấy được email từ Google.");
  }

  return {
    email: profile.email,
    fullName: profile.name || profile.given_name || profile.email,
    picture: profile.picture || null,
    googleId: profile.sub || null,
  };
}

async function findOrCreateGoogleUser(profile) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT id, full_name, email, phone, activate, created_at
       FROM users
       WHERE email = LOWER($1)
       LIMIT 1`,
      [profile.email],
    );

    let user = existingResult.rows[0] || null;

    if (!user) {
      const passwordHash = await createGooglePasswordHash();

      const createResult = await client.query(
        `INSERT INTO users (full_name, email, password, phone)
         VALUES ($1, LOWER($2), $3, $4)
         RETURNING id, full_name, email, phone, activate, created_at`,
        [
          profile.fullName.trim(),
          profile.email.trim(),
          passwordHash,
          null,
        ],
      );

      user = createResult.rows[0];
    }

    const roleId = await ensureCustomerRole(client);

    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = $2
       )`,
      [user.id, roleId],
    );

    await client.query("COMMIT");

    return await loadUserWithRoles(user.id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function googleLogin(req, res, next) {
  const { token } = req.body;

  if (!token?.trim()) {
    return res.status(400).json({
      message: "Google token là bắt buộc.",
    });
  }

  try {
    const googleProfile = await getGoogleProfile(token.trim());
    const user = await findOrCreateGoogleUser(googleProfile);

    if (!user || !user.activate) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return res.status(401).json({
      message: error.message || "Xác thực Google thất bại.",
    });
  }
}

async function profile(req, res, next) {
  try {
    const user = await loadUserWithRoles(req.auth.sub);

    if (!user || !user.activate) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    return res.json({
      user: formatUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  googleLogin,
  profile,
};
