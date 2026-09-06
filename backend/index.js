// backend/server.js
const express = require("express");
const cors = require("cors");
const path = require("path"); // 👈 THÊM PATH
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const pool = require("./config/database");
const apiRoutes = require("./routes");
const swaggerSpec = require("./swagger");
const bookingController = require("./controllers/booking.controller");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error.middleware");

const app = express();
const PORT = Number(process.env.PORT || 5000);

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost")
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50MB" }));
app.use(express.urlencoded({ extended: true, limit: "50MB" }));

// 🖼️ PHỤC VỤ THƯ MỤC ẢNH TĨNH CHO FRONTEND TRUY CẬP
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Đo lưu lượng HTTP Requests tự động (bảng 22: request_logs)
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";
  if (
    url.startsWith("/api") &&
    !url.startsWith("/api/docs") &&
    !url.includes("/admin/stats")
  ) {
    pool
      .query(
        `INSERT INTO public.request_logs (method, endpoint, created_at) VALUES ($1, $2, NOW())`,
        [req.method, url.split("?")[0]],
      )
      .catch(() => {});
  }
  next();
});

// Swagger UI
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Gắn trực tiếp route thanh toán
app.post("/api/bookings/confirm-payment", bookingController.confirmPayment);

// Các routes hệ thống
app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

// Khởi tạo bảng tự động (Self-healing)
async function initDatabaseTables() {
  try {
    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)
      .catch(() => {});

    await pool
      .query(
        `
      CREATE TABLE IF NOT EXISTS public.request_logs (
          id SERIAL PRIMARY KEY,
          method VARCHAR(10),
          endpoint VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON public.request_logs(created_at);
    `,
      )
      .catch(() => {});

    await pool
      .query(
        `
      CREATE TABLE IF NOT EXISTS public.notification (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'system',
          link VARCHAR(500),
          read_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notification_user_id ON public.notification(user_id);
    `,
      )
      .catch(() => {});

    await pool
      .query(
        `
      CREATE TABLE IF NOT EXISTS public.chatbot_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          session_id VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL,
          message TEXT NOT NULL,
          extracted_filter JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `,
      )
      .catch(() => {});

    console.log("✓ Đồng bộ và bảo vệ cấu trúc Database hoàn tất.");
  } catch (err) {
    console.warn("Khởi tạo bảng phụ trợ:", err.message);
  }
}

async function startServer() {
  try {
    await pool.query("SELECT 1");
    await initDatabaseTables();

    app.listen(PORT, () => {
      console.log(`Server chạy tại http://localhost:${PORT}`);
      console.log(
        `Đã kết nối PostgreSQL: ${process.env.DB_NAME || "hotel_booking"}`,
      );
    });
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
