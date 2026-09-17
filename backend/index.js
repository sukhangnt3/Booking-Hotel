// backend/server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const pool = require("./config/database");
const apiRoutes = require("./routes");
const swaggerSpec = require("./swagger");

// 🌟 IMPORT ROUTE THANH TOÁN (SEPAY / VIETQR)
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
// CORS
// ============================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://booking-hotel-fawn.vercel.app",
];

// Cho phép thêm FRONTEND_URL từ Render Environment nếu có
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .forEach((origin) => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
}

console.log("CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Request không có Origin
      // Postman / server-to-server / SePay webhook
      if (!origin) {
        return callback(null, true);
      }

      // Origin được cho phép
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Cho phép localhost
      if (origin.startsWith("http://localhost:")) {
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
// BODY PARSER
// ============================================================

app.use(
  express.json({
    limit: "50MB",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50MB",
  }),
);

// ============================================================
// UPLOADS
// ============================================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/uploads", express.static(path.resolve("backend/uploads")));

// ============================================================
// REQUEST LOGS
// ============================================================

app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";

  if (
    url.startsWith("/api") &&
    !url.startsWith("/api/docs") &&
    !url.includes("/admin/stats")
  ) {
    pool
      .query(
        `
        INSERT INTO public.request_logs
        (method, endpoint, created_at)
        VALUES ($1, $2, NOW())
        `,
        [req.method, url.split("?")[0]],
      )
      .catch((error) => {
        // Không nuốt lỗi nữa.
        // In lỗi ra để biết chính xác database đang bị gì.
        console.error("❌ REQUEST_LOGS ERROR:", error.message);

        console.error(
          "❌ REQUEST_LOGS DETAIL:",
          error.detail || "Không có detail",
        );

        console.error("❌ REQUEST_LOGS HINT:", error.hint || "Không có hint");

        console.error(
          "❌ REQUEST_LOGS CODE:",
          error.code || "Không có error code",
        );
      });
  }

  next();
});

// ============================================================
// SWAGGER
// ============================================================

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// PAYMENT
// ============================================================

// SePay / VietQR
app.use("/api/payments", paymentRoutes);

// Endpoint xác nhận đơn cũ
app.post("/api/bookings/confirm-payment", bookingController.confirmPayment);

// ============================================================
// REVIEW ROUTES
// ============================================================

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

// ============================================================
// MAIN API ROUTES
// ============================================================

app.use("/api", apiRoutes);

// ============================================================
// 404 + ERROR HANDLER
// ============================================================

app.use(notFoundHandler);

app.use(errorHandler);

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initDatabaseTables() {
  try {
    // ========================================================
    // PGCRYPTO
    // ========================================================

    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)
      .catch((error) => {
        console.warn("⚠️ Không thể tạo pgcrypto:", error.message);
      });

    // ========================================================
    // UNACCENT
    // ========================================================

    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "unaccent";`)
      .catch((error) => {
        console.warn("⚠️ Không thể tạo unaccent:", error.message);
      });

    // ========================================================
    // HOTEL PROPERTY TYPE
    // ========================================================

    await pool
      .query(
        `
        ALTER TABLE public.hotel
        ADD COLUMN IF NOT EXISTS property_type
        VARCHAR(50)
        DEFAULT 'hotel';
        `,
      )
      .catch((error) => {
        console.warn("⚠️ Không thể thêm hotel.property_type:", error.message);
      });

    // ========================================================
    // REVIEW POINT CONSTRAINT
    // ========================================================

    await pool
      .query(
        `
        ALTER TABLE public.review
        DROP CONSTRAINT IF EXISTS chk_review_point;

        ALTER TABLE public.review
        ADD CONSTRAINT chk_review_point
        CHECK (point >= 1 AND point <= 10);
        `,
      )
      .catch((error) => {
        console.warn("⚠️ Không thể cập nhật review constraint:", error.message);
      });

    // ========================================================
    // REQUEST LOGS
    // ========================================================
    //
    // id = SERIAL
    // → INTEGER
    //
    // Không truyền id khi INSERT.
    // PostgreSQL tự tăng id bằng sequence.
    //
    // ========================================================

    await pool
      .query(
        `
        CREATE TABLE IF NOT EXISTS public.request_logs (
          id SERIAL PRIMARY KEY,
          method VARCHAR(10),
          endpoint VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        `,
      )
      .catch((error) => {
        console.warn("⚠️ Không thể tạo request_logs:", error.message);
      });

    // ========================================================
    // REQUEST LOGS INDEX
    // ========================================================

    await pool
      .query(
        `
        CREATE INDEX IF NOT EXISTS
        idx_request_logs_created_at
        ON public.request_logs(created_at);
        `,
      )
      .catch((error) => {
        console.warn("⚠️ Không thể tạo request_logs index:", error.message);
      });

    // ========================================================
    // CHATBOT LOG
    // ========================================================
    //
    // id = UUID
    // → dùng gen_random_uuid()
    //
    // ========================================================

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
      .catch((error) => {
        console.warn("⚠️ Không thể tạo chatbot_log:", error.message);
      });

    console.log("✓ Đồng bộ và bảo vệ cấu trúc Database hoàn tất.");
  } catch (err) {
    console.warn("Khởi tạo bảng phụ trợ thất bại:", err.message);
  }
}

// ============================================================
// START SERVER
// ============================================================

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

    console.error("Database error detail:", error.detail || "Không có detail");

    console.error("Database error code:", error.code || "Không có error code");

    process.exit(1);
  }
}

startServer();
