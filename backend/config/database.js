// backend/config/database.js

const { Pool } = require("pg");

let pool;

// Cấu hình chung tối ưu hiệu năng và độ ổn định kết nối
const poolConfig = {
  max: Number(process.env.DB_POOL_MAX || 20), // Tối đa 20 kết nối đồng thời
  idleTimeoutMillis: 30000, // Đóng kết nối rảnh sau 30s để tiết kiệm RAM cho Neon
  connectionTimeoutMillis: 10000, // Cho phép chờ tối đa 10s khi Neon "thức dậy" (Cold Start)
  keepAlive: true, // Giữ kết nối Cloud không bị rớt bất thình lình
  keepAliveInitialDelayMillis: 10000,
};

// ============================================================
// 1. NEON DATABASE (CLOUD)
// ============================================================
if (process.env.DATABASE_URL) {
  console.log("🔵 Database mode: NEON / DATABASE_URL");

  pool = new Pool({
    ...poolConfig,
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

// ============================================================
// 2. LOCAL POSTGRESQL
// ============================================================
else {
  console.log("🟢 Database mode: LOCAL POSTGRESQL");

  pool = new Pool({
    ...poolConfig,
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "hotel_booking",
  });
}

// ============================================================
// XỬ LÝ SỰ KIỆN KẾT NỐI POOL
// ============================================================
pool.on("error", (err) => {
  console.error("⚠️ Lỗi kết nối PostgreSQL Pool bất ngờ:", err.message);
});

module.exports = pool;
