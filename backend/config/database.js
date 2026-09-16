// backend/config/database.js

const { Pool } = require("pg");

let pool;

// ============================================================
// NEON DATABASE
// ============================================================

if (process.env.DATABASE_URL) {
  console.log("🔵 Database mode: NEON / DATABASE_URL");

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
      rejectUnauthorized: false,
    },
  });
}

// ============================================================
// LOCAL POSTGRESQL
// ============================================================
else {
  console.log("🟢 Database mode: LOCAL POSTGRESQL");

  pool = new Pool({
    host: process.env.DB_HOST || "localhost",

    port: Number(process.env.DB_PORT || 5432),

    user: process.env.DB_USER || "postgres",

    password: process.env.DB_PASSWORD || "",

    database: process.env.DB_NAME || "hotel_booking",
  });
}

// ============================================================
// DATABASE ERROR HANDLER
// ============================================================

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

// ============================================================
// EXPORT
// ============================================================

module.exports = pool;
