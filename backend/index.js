const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/database");
const apiRoutes = require("./routes");
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

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));
app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => {
      console.log(`Server chạy tại http://localhost:${PORT}`);
      console.log(
        `Đã kết nối PostgreSQL database: ${process.env.DB_NAME || "hotel_booking"}`,
      );
      console.log(`Allowed CORS origins: ${allowedOrigins.join(", ")}`);
    });
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:", error.message);
    process.exit(1);
  }
}

startServer();
