const express = require("express");
const {
  getStats,
  listUsers,
  updateUserRole,
  toggleUserStatus,
  listAllBookings,
  updateBookingStatusAdmin,
  listAdminHotels,
  updateHotelStatus,
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  listReviews,
  deleteReview,
} = require("./admin.controller");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── TẤT CẢ ROUTE ADMIN ĐỀU CẦN: ĐĂNG NHẬP + ROLE ADMIN ───
router.use(requireAuth);
router.use(requireRole("admin"));

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Thống kê tổng quan (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Thống kê users, bookings, hotels, revenue
 */
router.get("/stats", getStats);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Danh sách user (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách user
 */
router.get("/users", listUsers);

/**
 * @swagger
 * /admin/users/{id}/role:
 *   patch:
 *     summary: Đổi vai trò user (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role: { type: string, example: admin }
 *     responses:
 *       200:
 *         description: Đổi vai trò thành công
 */
router.patch("/users/:id/role", updateUserRole);

/**
 * @swagger
 * /admin/users/{id}/status:
 *   patch:
 *     summary: Khóa/mở khóa user (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 */
router.patch("/users/:id/status", toggleUserStatus);

/**
 * @swagger
 * /admin/bookings:
 *   get:
 *     summary: Danh sách đơn đặt (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách đơn
 */
router.get("/bookings", listAllBookings);

/**
 * @swagger
 * /admin/bookings/{id}/status:
 *   patch:
 *     summary: Đổi trạng thái đơn (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, example: confirmed }
 *     responses:
 *       200:
 *         description: Đổi trạng thái thành công
 */
router.patch("/bookings/:id/status", updateBookingStatusAdmin);

/**
 * @swagger
 * /admin/hotels:
 *   get:
 *     summary: Danh sách khách sạn (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách khách sạn
 */
router.get("/hotels", listAdminHotels);

/**
 * @swagger
 * /admin/hotels/{id}/status:
 *   patch:
 *     summary: Duyệt/từ chối khách sạn (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, example: approved }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch("/hotels/:id/status", updateHotelStatus);

/**
 * @swagger
 * /admin/promotions:
 *   get:
 *     summary: Danh sách khuyến mãi (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách khuyến mãi
 *   post:
 *     summary: Tạo khuyến mãi (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               type: { type: string, example: percentage }
 *               value: { type: number }
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.get("/promotions", listPromotions);
router.post("/promotions", createPromotion);

/**
 * @swagger
 * /admin/promotions/{id}:
 *   put:
 *     summary: Cập nhật khuyến mãi (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Xóa khuyến mãi (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.put("/promotions/:id", updatePromotion);
router.delete("/promotions/:id", deletePromotion);

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     summary: Danh sách đánh giá (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 */
router.get("/reviews", listReviews);

/**
 * @swagger
 * /admin/reviews/{id}:
 *   delete:
 *     summary: Xóa đánh giá (admin)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/reviews/:id", deleteReview);

module.exports = router;
