const express = require("express");
const pool = require("../config/database");

const router = express.Router();

/**
 * @swagger
 * /test:
 *   get:
 *     summary: Kiểm tra kết nối backend và database
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Backend và database đang hoạt động
 */
router.get("/test", async (req, res, next) => {
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

module.exports = router;
