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
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
}));
app.use(express.json());

app.use("/api", apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");
    console.log(`Server chạy tại http://localhost:${PORT}`);
    console.log(
      `Đã kết nối PostgreSQL database: ${process.env.DB_NAME || "hotel_booking"}`,
    );
  } catch (error) {
    console.error("Không thể kết nối PostgreSQL:", error.message);
  }
});
