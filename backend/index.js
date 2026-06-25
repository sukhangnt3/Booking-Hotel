const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { promisify } = require("util");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const scryptAsync = promisify(crypto.scrypt);
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "hotel_booking",
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, storedPassword) {
  const [algorithm, salt, storedKey] = storedPassword.split("$");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;
  const key = await scryptAsync(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, "hex");
  return storedBuffer.length === key.length
    && crypto.timingSafeEqual(storedBuffer, key);
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    email: user.email,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "local-development-secret")
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

app.get("/api/test", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT current_database() AS database");
    res.json({
      message: "Backend NodeJS và PostgreSQL đang hoạt động.",
      database: result.rows[0].database,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  const { fullName, email, password, phoneNumber } = req.body;
  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Họ tên, email và mật khẩu là bắt buộc." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await hashPassword(password);
    const userResult = await client.query(
      `INSERT INTO users (full_name, email, password, phone)
       VALUES ($1, LOWER($2), $3, $4)
       RETURNING id, full_name, email, phone, activate, created_at`,
      [fullName.trim(), email.trim(), passwordHash, phoneNumber?.trim() || null],
    );
    const roleResult = await client.query(
      `INSERT INTO roles (name) VALUES ('customer')
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
      user: userResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }
    return next(error);
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email và mật khẩu là bắt buộc." });
  }

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, password, phone, activate
       FROM users WHERE email = LOWER($1)`,
      [email.trim()],
    );
    const user = result.rows[0];
    if (!user || !user.activate || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng." });
    }

    const { password: ignoredPassword, ...safeUser } = user;
    return res.json({
      message: "Đăng nhập thành công.",
      token: createToken(user),
      user: safeUser,
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: process.env.NODE_ENV === "production" ? "Máy chủ gặp lỗi." : error.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");
    console.log(`Server chạy tại http://localhost:${PORT}`);
    console.log(`Đã kết nối PostgreSQL database: ${process.env.DB_NAME || "hotel_booking"}`);
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:", error.message);
  }
});
