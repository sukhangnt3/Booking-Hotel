// backend/config/database.js
const { Pool, types } = require("pg");
require("dotenv").config();

// 🌟 1. ÉP MÚI GIỜ MÔI TRƯỜNG NODE.JS VỀ GMT+7 (VIỆT NAM)
process.env.TZ = "Asia/Ho_Chi_Minh";

// 🌟 2. CHỐNG TỤT NGÀY: ÉP CỘT KIỂU DATE TRẢ VỀ STRING YYYY-MM-DD THUẦN TÚY (KHÔNG BỊ LỆCH MÚI GIỜ UTC)
types.setTypeParser(1082, (str) => str);

let pool;

// Cấu hình chung tối ưu hiệu năng và độ ổn định kết nối cho Neon Cloud
const poolConfig = {
  max: Number(process.env.DB_POOL_MAX || 20), // Tối đa 20 kết nối đồng thời
  idleTimeoutMillis: 30000, // Đóng kết nối rảnh sau 30s để tiết kiệm RAM cho Neon
  connectionTimeoutMillis: 10000, // Cho phép chờ tối đa 10s khi Neon "thức dậy" (Cold Start)
  keepAlive: true, // Giữ kết nối Cloud không bị rớt bất thình lình
  keepAliveInitialDelayMillis: 10000,
  options: "-c timezone=Asia/Ho_Chi_Minh", // 🌟 Ép múi giờ phiên làm việc Postgres về Việt Nam
};

// ============================================================
// 1. NEON DATABASE (CLOUD)
// ============================================================
if (process.env.DATABASE_URL) {
  console.log(
    "🔵 Database mode: NEON / DATABASE_URL (Timezone: Asia/Ho_Chi_Minh)",
  );

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
  console.log(
    "🟢 Database mode: LOCAL POSTGRESQL (Timezone: Asia/Ho_Chi_Minh)",
  );

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
// ĐẢM BẢO MỖI CLIENT KẾT NỐI VÀO POOL ĐỀU SET TIMEZONE VIỆT NAM
// ============================================================
pool.on("connect", async (client) => {
  try {
    await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
  } catch (err) {
    console.warn("⚠️ Cảnh báo set timezone phiên làm việc:", err.message);
  }
});

// ============================================================
// XỬ LÝ SỰ KIỆN KẾT NỐI POOL
// ============================================================
pool.on("error", (err) => {
  console.error("⚠️ Lỗi kết nối PostgreSQL Pool bất ngờ:", err.message);
});

module.exports = pool;
