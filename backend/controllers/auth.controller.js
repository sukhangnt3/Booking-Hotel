const pool = require("../config/database");
const { hashPassword, verifyPassword } = require("../utils/password");
const { createToken } = require("../utils/token");
const { formatUser } = require("../utils/formatters");

async function register(req, res, next) {
  const fullName = req.body.name ?? req.body.fullName;
  const phone = req.body.phone ?? req.body.phoneNumber;
  const { email, password } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({
      message: "Họ tên, email và mật khẩu là bắt buộc.",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Mật khẩu phải có ít nhất 6 ký tự.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const passwordHash = await hashPassword(password);
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password, phone)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, full_name, email, phone, activate, created_at`,
      [
        fullName.trim(),
        email.trim(),
        passwordHash,
        phone?.trim() || null,
      ],
    );

    const roleResult = await client.query(
      `INSERT INTO roles (name)
       VALUES ('customer')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );

    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
      [userResult.rows[0].id, roleResult.rows[0].id],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Đăng ký thành công.",
      user: formatUser(userResult.rows[0]),
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Email đã được sử dụng.",
      });
    }

    return next(error);
  } finally {
    client.release();
  }
}

async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({
      message: "Email và mật khẩu là bắt buộc.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password, phone, activate, created_at
       FROM users
       WHERE email = LOWER($1)`,
      [email.trim()],
    );

    const user = result.rows[0];
    const validPassword = user
      ? await verifyPassword(password, user.password)
      : false;

    if (!user || !user.activate || !validPassword) {
      return res.status(401).json({
        message: "Email hoặc mật khẩu không đúng.",
      });
    }

    return res.json({
      message: "Đăng nhập thành công.",
      token: createToken(user),
      user: formatUser(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function profile(req, res, next) {
  try {
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
      [req.auth.sub],
    );

    const user = result.rows[0];

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
  register,
  login,
  profile,
};
