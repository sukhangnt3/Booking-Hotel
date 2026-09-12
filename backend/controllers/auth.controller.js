const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { createToken } = require("../utils/token");
const { formatUser } = require("../utils/formatters");

// ======================================================
// LOAD USER + ROLE
// ======================================================

async function loadUserWithRoles(userId) {
  const result = await pool.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.dob,
        u.avatar,
        u.activate,
        u.email_verified,
        u.phone_verified,
        u.last_login,
        u.created_at,
        u.updated_at,

        COALESCE(
          (
            SELECT UPPER(r2.name) 
            FROM public.user_roles ur2 
            JOIN public.roles r2 ON r2.id = ur2.role_id 
            WHERE ur2.user_id = u.id 
            LIMIT 1
          ),
          'CUSTOMER'
        ) AS role,

        COALESCE(
          array_agg(UPPER(r.name))
          FILTER (
            WHERE r.name IS NOT NULL
          ),
          ARRAY['CUSTOMER']
        ) AS roles

      FROM users u

      LEFT JOIN user_roles ur
        ON ur.user_id = u.id

      LEFT JOIN roles r
        ON r.id = ur.role_id

      WHERE u.id = $1::uuid

      GROUP BY u.id
    `,
    [userId],
  );

  return result.rows[0] || null;
}

// ======================================================
// ENSURE ROLE
// ======================================================

async function ensureRole(client, roleName = "customer") {
  const normalizedRole = String(roleName).toUpperCase();

  const result = await client.query(
    `
        INSERT INTO roles (id, name)
        VALUES (gen_random_uuid(), $1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `,
    [normalizedRole],
  );

  return result.rows[0].id;
}

// ======================================================
// AUTH RESPONSE
// ======================================================

function buildAuthResponse(user) {
  const token = createToken(user);
  return {
    message: "Thành công.",
    token,
    systemToken: token,
    user: formatUser ? formatUser(user) : user,
  };
}

// ======================================================
// GOOGLE PROFILE
// ======================================================

async function getGoogleProfile(accessToken) {
  const response = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) throw new Error("Token Google không hợp lệ.");
  const profile = await response.json();

  return {
    email: profile.email,
    fullName: profile.name || profile.given_name || profile.email,
    picture: profile.picture || null,
  };
}

// ======================================================
// CHECK EMAIL EXISTS (KIỂM TRA TRÙNG EMAIL Ở BƯỚC 1)
// ======================================================

async function checkEmailExists(req, res, next) {
  try {
    const email = (req.query.email || "").toString().trim().toLowerCase();
    if (!email) {
      return res.json({ success: true, exists: false });
    }

    const result = await pool.query(
      `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
      [email],
    );

    return res.json({
      success: true,
      exists: result.rows.length > 0,
    });
  } catch (error) {
    console.error("❌ LỖI CHECK_EMAIL_EXISTS:", error);
    return res.status(500).json({
      success: false,
      exists: false,
      message: error.message,
    });
  }
}

// ======================================================
// GOOGLE LOGIN
// ======================================================

async function googleLogin(req, res, next) {
  const { token } = req.body;
  if (!token?.trim())
    return res.status(400).json({ message: "Token là bắt buộc." });

  const client = await pool.connect();

  try {
    const profileData = await getGoogleProfile(token.trim());
    await client.query("BEGIN");

    let existing = await client.query(
      `SELECT id, avatar FROM users WHERE email = LOWER($1) LIMIT 1`,
      [profileData.email],
    );

    let user = existing.rows[0];

    if (!user) {
      const dummyPass = await bcrypt.hash(
        crypto.randomBytes(16).toString("hex"),
        10,
      );
      let safeAvatar = profileData.picture || null;
      if (safeAvatar && safeAvatar.length > 500) {
        safeAvatar = safeAvatar.split("?")[0];
        if (safeAvatar.length > 500) safeAvatar = null;
      }

      const createRes = await client.query(
        `
            INSERT INTO users (id, full_name, email, password, avatar, activate, email_verified, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, LOWER($2), $3, $4, true, true, NOW(), NOW())
            RETURNING id
          `,
        [profileData.fullName, profileData.email, dummyPass, safeAvatar],
      );

      user = createRes.rows[0];
      const roleId = await ensureRole(client, "CUSTOMER");

      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
        [user.id, roleId],
      );
    } else {
      if (!user.avatar && profileData.picture) {
        await client.query(
          `UPDATE users SET last_login = NOW(), avatar = $2 WHERE id = $1::uuid`,
          [user.id, profileData.picture],
        );
      } else {
        await client.query(
          `UPDATE users SET last_login = NOW() WHERE id = $1::uuid`,
          [user.id],
        );
      }
    }

    await client.query("COMMIT");

    const freshUser = await loadUserWithRoles(user.id);
    const payload = buildAuthResponse(freshUser);

    return res.json({
      success: true,
      data: payload,
      ...payload,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res
      .status(401)
      .json({ message: error.message || "Đăng nhập Google thất bại." });
  } finally {
    client.release();
  }
}

// ======================================================
// REGISTER
// ======================================================

async function register(req, res, next) {
  const { full_name, fullName, email, password, phone, role } = req.body || {};
  const name = (fullName || full_name || "").trim();
  const targetEmail = (email || "").trim().toLowerCase();
  const targetRole = (role || "HOTEL_OWNER").toUpperCase();

  if (!name || !targetEmail || !password)
    return res
      .status(400)
      .json({ message: "Vui lòng nhập họ tên, email và mật khẩu." });
  if (password.length < 6)
    return res.status(400).json({ message: "Mật khẩu tối thiểu 6 ký tự." });

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
      `
          INSERT INTO users (id, full_name, email, password, phone, activate, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
          RETURNING id
        `,
      [name, targetEmail, hashedPassword, phone ? phone.trim() : null],
    );

    const newUser = createRes.rows[0];
    const roleId = await ensureRole(client, targetRole);

    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
      [newUser.id, roleId],
    );

    await client.query("COMMIT");

    const fullUser = await loadUserWithRoles(newUser.id);
    const payload = buildAuthResponse(fullUser);

    return res.status(201).json({
      success: true,
      message: "Đăng ký thành công!",
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

// ======================================================
// LOGIN
// ======================================================

async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Vui lòng nhập email và mật khẩu." });

  try {
    const result = await pool.query(
      `SELECT id, password, activate FROM users WHERE email = LOWER($1) LIMIT 1`,
      [String(email).trim()],
    );

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res
        .status(401)
        .json({ message: "Email hoặc mật khẩu không chính xác." });
    if (user.activate === false)
      return res
        .status(403)
        .json({ message: "Tài khoản của bạn đang bị khóa." });

    await pool.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1::uuid`,
      [user.id],
    );

    const fullUser = await loadUserWithRoles(user.id);
    const payload = buildAuthResponse(fullUser);

    return res.json({ success: true, data: payload, ...payload });
  } catch (error) {
    return next(error);
  }
}

// ======================================================
// GET PROFILE (F5 TRANG WEB)
// ======================================================

async function profile(req, res, next) {
  try {
    const userId = req.auth?.sub || req.auth?.id || req.user?.id;
    if (!userId)
      return res.status(401).json({ message: "Vui lòng đăng nhập." });

    const user = await loadUserWithRoles(userId);
    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng." });

    const formatted = formatUser ? formatUser(user) : user;

    formatted.avatar = user.avatar;

    return res.json({
      success: true,
      data: { user: formatted },
      user: formatted,
    });
  } catch (error) {
    return next(error);
  }
}

// ======================================================
// UPDATE PROFILE
// ======================================================

async function updateProfile(req, res, next) {
  try {
    const userId = req.auth?.sub || req.auth?.id || req.user?.id;
    if (!userId)
      return res.status(401).json({ message: "Chưa xác thực danh tính." });

    const { full_name, phone, dob, avatar } = req.body || {};

    let safeDob = null;
    if (dob && typeof dob === "string" && dob.trim() !== "") {
      const parsedDate = new Date(dob);
      if (!isNaN(parsedDate.getTime()))
        safeDob = parsedDate.toISOString().split("T")[0];
    }

    let safeAvatar = avatar;
    if (safeAvatar && typeof safeAvatar === "string") {
      safeAvatar = safeAvatar.trim();
      if (safeAvatar.length > 500)
        return res
          .status(400)
          .json({ success: false, message: "URL avatar quá dài." });
    }

    const updateQuery = `
      UPDATE public.users
      SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        dob = CASE WHEN $3::text IS NOT NULL THEN $3::date ELSE dob END,
        avatar = COALESCE($4, avatar),
        updated_at = NOW()
      WHERE id = $5::uuid
      RETURNING id;
    `;

    const result = await pool.query(updateQuery, [
      full_name && full_name.trim() !== "" ? full_name.trim() : null,
      phone && phone.trim() !== "" ? phone.trim() : null,
      safeDob,
      safeAvatar,
      userId,
    ]);

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ message: "Không tìm thấy người dùng để cập nhật." });

    const freshUser = await loadUserWithRoles(userId);
    const formatted = formatUser ? formatUser(freshUser) : freshUser;

    formatted.avatar = freshUser.avatar;

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ cá nhân thành công!",
      user: formatted,
      data: { user: formatted },
    });
  } catch (error) {
    console.error("❌ LỖI UPDATE_PROFILE:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi cơ sở dữ liệu: " + error.message });
  }
}

// ======================================================
// UPLOAD AVATAR (LÊN CLOUDINARY)
// ======================================================

async function uploadAvatar(req, res, next) {
  try {
    const userId = req.auth?.sub || req.auth?.id || req.user?.id;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Vui lòng đăng nhập." });
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ảnh đại diện." });

    const avatarUrl = req.file.path;

    await pool.query(
      `UPDATE public.users SET avatar = $1, updated_at = NOW() WHERE id = $2::uuid`,
      [avatarUrl, userId],
    );

    const freshUser = await loadUserWithRoles(userId);
    const formatted = formatUser ? formatUser(freshUser) : freshUser;

    formatted.avatar = avatarUrl;

    return res.json({
      success: true,
      message: "Cập nhật ảnh đại diện lên Cloudinary thành công!",
      user: formatted,
      data: { user: formatted },
      avatar: avatarUrl,
    });
  } catch (error) {
    console.error("❌ LỖI UPLOAD AVATAR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Không thể cập nhật ảnh đại diện.",
    });
  }
}

// ======================================================
// CHANGE PASSWORD
// ======================================================

async function changePassword(req, res, next) {
  try {
    const userId = req.auth?.sub || req.auth?.id || req.user?.id;
    const { oldPassword, newPassword } = req.body || {};

    if (!oldPassword || !newPassword)
      return res
        .status(400)
        .json({ message: "Vui lòng nhập mật khẩu cũ và mới." });
    if (newPassword.length < 6)
      return res
        .status(400)
        .json({ message: "Mật khẩu mới tối thiểu 6 ký tự." });

    const userRes = await pool.query(
      `SELECT password FROM public.users WHERE id = $1::uuid`,
      [userId],
    );
    const user = userRes.rows[0];

    if (!user || !(await bcrypt.compare(oldPassword, user.password)))
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE public.users SET password = $1, updated_at = NOW() WHERE id = $2::uuid`,
      [hashedPassword, userId],
    );

    return res.json({ success: true, message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  checkEmailExists,
  googleLogin,
  profile,
  login,
  register,
  updateProfile,
  uploadAvatar,
  changePassword,
};
