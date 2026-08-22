const crypto = require("crypto");
const pool = require("../config/database");
const { createToken } = require("../utils/token");
const { formatUser } = require("../utils/formatters");

// ─── 1. LOAD USER KÈM ROLE VÀ CỘT AVATAR ───
async function loadUserWithRoles(userId) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.phone,
       u.avatar,        -- 👈 ĐÃ BỔ SUNG CỘT AVATAR VÀO ĐÂY
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
    user: formatUser ? formatUser(user) : user,
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
    picture: profile.picture || null, // 👈 Link ảnh Google thật
    googleId: profile.sub || null,
  };
}

// ─── 2. TÌM HOẶC TẠO USER GOOGLE KÈM LƯU AVATAR ───
async function findOrCreateGoogleUser(profile) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingResult = await client.query(
      `SELECT id, full_name, email, phone, avatar, activate, created_at
       FROM users
       WHERE email = LOWER($1)
       LIMIT 1`,
      [profile.email],
    );

    let user = existingResult.rows[0] || null;

    if (!user) {
      const passwordHash = await createGooglePasswordHash();

      // 👈 ĐÃ SỬA: LƯU AVATAR VÀO BẢNG USERS KHI TẠO MỚI
      const createResult = await client.query(
        `INSERT INTO users (full_name, email, password, phone, avatar)
         VALUES ($1, LOWER($2), $3, $4, $5)
         RETURNING id, full_name, email, phone, avatar, activate, created_at`,
        [
          profile.fullName.trim(),
          profile.email.trim(),
          passwordHash,
          null,
          profile.picture, // Lưu link ảnh Google
        ],
      );

      user = createResult.rows[0];
    } else {
      // 👈 ĐÃ SỬA: CẬP NHẬT AVATAR MỚI NHẤT TỪ GOOGLE NẾU CHƯA CÓ
      await client.query(
        `UPDATE users 
         SET email = LOWER($1), 
             avatar = COALESCE(avatar, $2), 
             updated_at = NOW() 
         WHERE id = $3`,
        [profile.email.trim(), profile.picture, user.id],
      );
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

    const freshUser = await loadUserWithRoles(user.id);

    if (!freshUser || !freshUser.activate) {
      return res.status(401).json({
        message: "Tài khoản không tồn tại hoặc đã bị khóa.",
      });
    }

    const payload = buildAuthResponse(freshUser);

    return res.json({
      data: payload,
      ...payload,
    });
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

    const formatted = formatUser ? formatUser(user) : user;

    return res.json({
      data: { user: formatted },
      user: formatted,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 3. CẬP NHẬT THÔNG TIN PROFILE (ĐÃ BỔ SUNG CỘT AVATAR) ───
async function updateProfile(req, res, next) {
  const userId = req.auth?.sub;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fullName, full_name, phone, dob, gender, avatar, picture } =
    req.body || {};

  const updates = [];
  const params = [];
  let idx = 1;

  if (fullName || full_name) {
    updates.push(`full_name = $${idx}`);
    params.push((fullName || full_name).toString().trim());
    idx += 1;
  }

  if (typeof phone === "string") {
    updates.push(`phone = $${idx}`);
    params.push(phone.trim() || null);
    idx += 1;
  }

  if (dob) {
    updates.push(`dob = $${idx}`);
    params.push(dob);
    idx += 1;
  }

  if (gender) {
    updates.push(`gender = $${idx}`);
    params.push(gender);
    idx += 1;
  }

  // 👈 ĐÃ BỔ SUNG CẬP NHẬT CỘT AVATAR VÀO DATABASE
  const newAvatar = avatar || picture;
  if (typeof newAvatar === "string" && newAvatar.trim() !== "") {
    updates.push(`avatar = $${idx}`);
    params.push(newAvatar.trim());
    idx += 1;
  }

  if (updates.length === 0) {
    const user = await loadUserWithRoles(userId);
    const formatted = formatUser ? formatUser(user) : user;
    return res.json({ data: { user: formatted }, user: formatted });
  }

  const sql = `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING id, full_name, email, phone, avatar, activate, created_at`;
  params.push(userId);

  try {
    const result = await pool.query(sql, params);
    if (!result.rows[0]) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = await loadUserWithRoles(userId);
    const formatted = formatUser ? formatUser(user) : user;

    return res.json({
      message: "Cập nhật hồ sơ thành công.",
      data: { user: formatted },
      user: formatted,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  return res
    .status(501)
    .json({
      message: "Email/password login is not supported. Use Google login.",
    });
}

async function register(req, res, next) {
  return res
    .status(501)
    .json({ message: "Registration is disabled. Use Google signup." });
}

async function changePassword(req, res, next) {
  return res
    .status(501)
    .json({
      message: "Password change not supported for Google-only accounts.",
    });
}

module.exports = {
  googleLogin,
  profile,
  login,
  register,
  updateProfile,
  changePassword,
};
