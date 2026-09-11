// backend/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const pool = require("./config/database");
const apiRoutes = require("./routes");
const swaggerSpec = require("./swagger");
const bookingController = require("./controllers/booking.controller");
const reviewController = require("./controllers/review.controller");
const { requireAuth } = require("./middleware/auth.middleware");
const {
  errorHandler,
  notFoundHandler,
} = require("./middleware/error.middleware");

const app = express();
const PORT = Number(process.env.PORT || 5000);

/* ============================================================
   CORS - LOCAL + VERCEL PRODUCTION
   ============================================================ */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://booking-hotel-lkip.vercel.app",
];

// Cho phép thêm domain từ Render Environment Variable
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
      // Request không có Origin (Postman, server-to-server...)
      if (!origin) {
        return callback(null, true);
      }

      // Cho phép domain trong danh sách
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Cho phép localhost
      if (origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }

      console.warn("CORS blocked:", origin);

      // Không throw Error để tránh làm mất response
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

// Xử lý preflight request
app.options("*", cors());

/* ============================================================
   BODY PARSER
   ============================================================ */

app.use(express.json({ limit: "50MB" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "50MB",
  }),
);

/* ============================================================
   STATIC UPLOADS
   ============================================================ */

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/uploads", express.static(path.resolve("uploads")));

app.use("/uploads", express.static(path.resolve("backend/uploads")));

/* ============================================================
   REQUEST LOGGING
   ============================================================ */

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
      .catch(() => {});
  }

  next();
});

/* ============================================================
   SWAGGER
   ============================================================ */

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* ============================================================
   PAYMENT ROUTE
   ============================================================ */

app.post("/api/bookings/confirm-payment", bookingController.confirmPayment);

/* ============================================================
   REVIEW ROUTES
   ============================================================ */

// Lấy danh sách review của khách sạn
app.get("/api/hotels/:id/reviews", reviewController.listHotelReviews);

app.get("/api/hotels/:hotelId/reviews", reviewController.listHotelReviews);

app.get("/api/reviews/hotel/:hotelId", reviewController.listHotelReviews);

app.get("/api/reviews/:hotelId", reviewController.listHotelReviews);

// Tạo review
app.post("/api/hotels/:id/reviews", requireAuth, reviewController.createReview);

app.post(
  "/api/hotels/:hotelId/reviews",
  requireAuth,
  reviewController.createReview,
);

app.post("/api/reviews", requireAuth, reviewController.createReview);

// Trả lời review
app.patch("/api/reviews/:id/reply", requireAuth, reviewController.replyReview);

app.post("/api/reviews/:id/reply", requireAuth, reviewController.replyReview);

/* ============================================================
   MAIN API ROUTES
   ============================================================ */

app.use("/api", apiRoutes);

/* ============================================================
   404 + ERROR HANDLER
   ============================================================ */

app.use(notFoundHandler);

app.use(errorHandler);

/* ============================================================
   DATABASE SELF-HEALING
   ============================================================ */

async function initDatabaseTables() {
  try {
    // PostgreSQL extensions
    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`)
      .catch(() => {});

    await pool
      .query(`CREATE EXTENSION IF NOT EXISTS "unaccent";`)
      .catch(() => {});

    // ========================================================
    // HOTEL
    // ========================================================

    await pool
      .query(
        `
        ALTER TABLE public.hotel
        ADD COLUMN IF NOT EXISTS
        property_type VARCHAR(50) DEFAULT 'hotel';
        `,
      )
      .catch(() => {});

    // ========================================================
    // REVIEW POINT 1 - 10
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
      .catch(() => {});

    // ========================================================
    // REQUEST LOGS
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

        CREATE INDEX IF NOT EXISTS
        idx_request_logs_created_at
        ON public.request_logs(created_at);
        `,
      )
      .catch(() => {});

    // ========================================================
    // CHATBOT LOG
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
      .catch(() => {});

    console.log("✓ Đồng bộ Database hoàn tất.");
  } catch (err) {
    console.warn("Khởi tạo bảng phụ trợ thất bại:", err.message);
  }
}

/* ============================================================
   START SERVER
   ============================================================ */

async function startServer() {
  try {
    // Test PostgreSQL
    await pool.query("SELECT 1");

    console.log("✓ PostgreSQL connection OK");

    // Initialize database
    await initDatabaseTables();

    // Start Express
    app.listen(PORT, () => {
      console.log(`✓ Server chạy tại port ${PORT}`);

      console.log(`✓ Database: ${process.env.DB_NAME || "hotel_booking"}`);

      console.log(
        "✓ Frontend URL:",
        process.env.FRONTEND_URL || "Not configured",
      );

      console.log("✓ CORS origins:", allowedOrigins);
    });
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:", error.message);

    process.exit(1);
  }
}

startServer();
