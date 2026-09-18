// backend/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const compression = require("compression"); // 🌟 Tối ưu nén dữ liệu mạng
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const pool = require("./config/database");
const apiRoutes = require("./routes");
const swaggerSpec = require("./swagger");
const paymentRoutes = require("./routes/payment.routes");
const bookingController = require("./controllers/booking.controller");
const reviewController = require("./controllers/review.controller");
const { requireAuth } = require("./middleware/auth.middleware");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error.middleware");

const app = express();
const PORT = Number(process.env.PORT || 5000);

// ============================================================
// 1. NÉN DỮ LIỆU (GZIP / BROTLI)
// ============================================================
app.use(
  compression({
    level: 6,
    threshold: 1024, // Chỉ nén các response lớn hơn 1KB
  }),
);

// ============================================================
// 2. CORS
// ============================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://booking-hotel-fawn.vercel.app",
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .forEach((o) => {
      if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
    });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost:")
      ) {
        return callback(null, true);
      }
      console.warn("CORS blocked:", origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  }),
);

// ============================================================
// 3. BODY PARSER
// ============================================================
app.use(express.json({ limit: "50MB" }));
app.use(express.urlencoded({ extended: true, limit: "50MB" }));

// ============================================================
// 4. PHỤC VỤ FILE TĨNH (KÈM CACHE 7 NGÀY CHO ẢNH)
// ============================================================
const uploadsDir = path.resolve("uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(
  "/uploads",
  express.static(uploadsDir, {
    maxAge: "7d", // Trình duyệt tự cache ảnh 7 ngày, không tải lại
    immutable: true,
  }),
);

// ============================================================
// 5. GHI LOG REQUEST (BỎ QUA OPTIONS & DOCS ĐỂ GIẢM TẢI DB)
// ============================================================
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";

  if (
    req.method !== "OPTIONS" &&
    url.startsWith("/api") &&
    !url.startsWith("/api/docs") &&
    !url.includes("/admin/stats")
  ) {
    pool
      .query(
        `INSERT INTO public.request_logs (method, endpoint, created_at) VALUES ($1, $2, NOW())`,
        [req.method, url.split("?")[0]],
      )
      .catch((error) => {
        // Chỉ in lỗi ngắn gọn tránh spam terminal
        console.error("❌ REQUEST_LOGS ERROR:", error.message);
      });
  }
  next();
});

// ============================================================
// 6. TỰ ĐỘNG DỌN DẸP KHÓA PHÒNG & LOG CŨ (MỖI 10 PHÚT)
// ============================================================
setInterval(
  async () => {
    try {
      // 1. Dọn dẹp phòng khóa tạm thời đã hết hạn
      const resLock = await pool.query(
        `DELETE FROM public.temporary_locks WHERE expires_at < NOW()`,
      );
      if (resLock.rowCount > 0) {
        console.log(
          `🧹 [CRON] Đã dọn dẹp ${resLock.rowCount} khóa phòng tạm thời hết hạn.`,
        );
      }

      // 2. 🌟 Tự động xóa log truy cập cũ quá 30 ngày để tránh phình dung lượng Database
      const resLogs = await pool.query(
        `DELETE FROM public.request_logs WHERE created_at < NOW() - INTERVAL '30 days'`,
      );
      if (resLogs.rowCount > 0) {
        console.log(
          `🧹 [CRON] Đã dọn dẹp ${resLogs.rowCount} dòng request_logs cũ quá 30 ngày.`,
        );
      }
    } catch (err) {
      console.warn("⚠️ Cron cleanup error:", err.message);
    }
  },
  10 * 60 * 1000, // Định kỳ 10 phút chạy một lần
);

// ============================================================
// 7. SWAGGER & ROUTERS
// ============================================================
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Thanh toán SePay / VietQR
app.use("/api/payments", paymentRoutes);
app.post("/api/bookings/confirm-payment", bookingController.confirmPayment);

// Review Routes
app.get("/api/hotels/:id/reviews", reviewController.listHotelReviews);
app.get("/api/hotels/:hotelId/reviews", reviewController.listHotelReviews);
app.get("/api/reviews/hotel/:hotelId", reviewController.listHotelReviews);
app.get("/api/reviews/:hotelId", reviewController.listHotelReviews);
app.post("/api/hotels/:id/reviews", requireAuth, reviewController.createReview);
app.post(
  "/api/hotels/:hotelId/reviews",
  requireAuth,
  reviewController.createReview,
);
app.post("/api/reviews", requireAuth, reviewController.createReview);
app.patch("/api/reviews/:id/reply", requireAuth, reviewController.replyReview);
app.post("/api/reviews/:id/reply", requireAuth, reviewController.replyReview);

// Main API Routes
app.use("/api", apiRoutes);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================================
// 8. KHỞI CHẠY SERVER & BẢO VỆ DATABASE
// ============================================================
async function initDatabaseTables() {
  try {
    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)
      .catch(() => {});
    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "unaccent";`)
      .catch(() => {});

    // Đảm bảo bảng phụ trợ tồn tại
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

    console.log("✓ Đồng bộ cấu trúc Database hoàn tất.");
  } catch (err) {
    console.warn("Khởi tạo bảng phụ trợ thất bại:", err.message);
  }
}

async function startServer() {
  try {
    await pool.query("SELECT 1");
    await initDatabaseTables();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
      console.log(
        `📦 Kết nối PostgreSQL: ${process.env.DB_NAME || "hotel_booking"}`,
      );
    });

    // Graceful Shutdown: Đóng kết nối an toàn khi server restart
    const handleShutdown = async (signal) => {
      console.log(`\nNhận tín hiệu ${signal}. Đang đóng server an toàn...`);
      server.close(async () => {
        try {
          await pool.end();
          console.log("✓ Đã đóng kết nối PostgreSQL Pool.");
          process.exit(0);
        } catch (e) {
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  } catch (error) {
    console.error("❌ Không thể khởi động server:", error.message);
    process.exit(1);
  }
}

startServer();
