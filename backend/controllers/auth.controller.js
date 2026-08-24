const crypto = require("crypto");
const bcrypt = require("bcryptjs"); // Chạy: npm install bcryptjs
const pool = require("../config/database");
const { createToken } = require("../utils/token");
const { formatUser } = require("../utils/formatters");

// ─── 1. LOAD USER & ROLE ───
async function loadUserWithRoles(userId) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.full_name,
       u.email,
       u.phone,
       u.avatar,
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

async function ensureRole(client, roleName = "customer") {
  const result = await client.query(
    `INSERT INTO roles (name)
     VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [roleName],
  );

  return result.rows[0].id;
}

function buildAuthResponse(user) {
  const token = createToken(user);
  return {
    message: "Thành công.",
    token,
    systemToken: token,
    user: formatUser ? formatUser(user) : user,
  };
}

// ─── 2. GOOGLE LOGIN CHO KHÁCH HÀNG BÌNH THƯỜNG (VẪN GIỮ NGUYÊN) ───
async function getGoogleProfile(accessToken) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) throw new Error("Token Google không hợp lệ.");
  const profile = await response.json();

  return {
    email: profile.email,
    fullName: profile.name || profile.given_name || profile.email,
    picture: profile.picture || null,
  };
}

async function googleLogin(req, res, next) {
  const { token } = req.body;
  if (!token?.trim())
    return res.status(400).json({ message: "Token là bắt buộc." });

  const client = await pool.connect();
  try {
    const profile = await getGoogleProfile(token.trim());
    await client.query("BEGIN");

    let existing = await client.query(
      `SELECT id FROM users WHERE email = LOWER($1) LIMIT 1`,
      [profile.email],
    );

    let user = existing.rows[0];

    if (!user) {
      const dummyPass = await bcrypt.hash(
        crypto.randomBytes(16).toString("hex"),
        10,
      );
      const createRes = await client.query(
        `INSERT INTO users (full_name, email, password, avatar)
         VALUES ($1, LOWER($2), $3, $4)
         RETURNING id`,
        [profile.fullName, profile.email, dummyPass, profile.picture],
      );
      user = createRes.rows[0];
      const roleId = await ensureRole(client, "customer");
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [user.id, roleId],
      );
    }

    await client.query("COMMIT");

    const freshUser = await loadUserWithRoles(user.id);
    const payload = buildAuthResponse(freshUser);
    return res.json({ data: payload, ...payload });
  } catch (error) {
    await client.query("ROLLBACK");
    return res
      .status(401)
      .json({ message: error.message || "Đăng nhập Google thất bại." });
  } finally {
    client.release();
  }
}

// ─── 3. ĐĂNG KÝ RIÊNG CHO ĐỐI TÁC CHỦ CHỖ NGHỈ (DÙNG EMAIL/MẬT KHẨU) ───
async function register(req, res, next) {
  const { full_name, fullName, email, password, phone, role } = req.body || {};
  const name = (fullName || full_name || "").trim();
  const targetEmail = (email || "").trim().toLowerCase();
  const targetRole = role || "owner"; // Tự động gán role owner cho chủ nhà

  if (!name || !targetEmail || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập họ tên, email và mật khẩu." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const check = await client.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [targetEmail],
    );
    if (check.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const createRes = await client.query(
      `INSERT INTO users (full_name, email, password, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, phone, avatar, activate, created_at`,
      [name, targetEmail, hashedPassword, phone ? phone.trim() : null],
    );

    const newUser = createRes.rows[0];

    // Gán quyền owner
    const roleId = await ensureRole(client, targetRole);
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [newUser.id, roleId],
    );

    await client.query("COMMIT");

    const fullUser = await loadUserWithRoles(newUser.id);
    const payload = buildAuthResponse(fullUser);

    return res.status(201).json({
      message: "Đăng ký đối tác thành công!",
      data: payload,
      ...payload,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 4. ĐĂNG NHẬP THƯỜNG / PROFILE ───
async function login(req, res, next) {
  const { email, password } = req.body || {};
  try {
    const result = await pool.query(
      `SELECT id, password, activate FROM users WHERE email = LOWER($1) LIMIT 1`,
      [(email || "").trim()],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác." });
    }
    const fullUser = await loadUserWithRoles(user.id);
    const payload = buildAuthResponse(fullUser);
    return res.json({ data: payload, ...payload });
  } catch (error) {
    return next(error);
  }
}

async function profile(req, res, next) {
  try {
    const user = await loadUserWithRoles(req.auth.sub);
    const formatted = formatUser ? formatUser(user) : user;
    return res.json({ data: { user: formatted }, user: formatted });
  } catch (error) {
    return next(error);
  }
}

async function updateProfile(req, res, next) {
  // code cập nhật profile giữ nguyên
}

async function changePassword(req, res, next) {
  // code đổi mật khẩu giữ nguyên
}

module.exports = {
  googleLogin,
  profile,
  login,
  register,
  updateProfile,
  changePassword,
};
