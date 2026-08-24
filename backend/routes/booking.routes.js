const express = require("express");
const {
  createBooking,
  createTemporaryLock,
  getBookingDetail,
  cancelBooking,
  updateBookingStatus,
  listMyBookings,
} = require("../controllers/booking.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

/**
 * @swagger
 * /bookings/temp-lock:
 *   post:
 *     summary: Tạo khóa phòng tạm thời
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               room_id: { type: string }
 *               checkIn: { type: string }
 *               quantity: { type: number }
 *     responses:
 *       201:
 *         description: Khóa phòng thành công
 */
router.post("/temp-lock", createTemporaryLock);

/**
 * @swagger
 * /bookings/my:
 *   get:
 *     summary: Lấy danh sách đơn đặt của user
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Danh sách đơn đặt
 */
router.get("/my", listMyBookings);

/**
 * @swagger
 * /bookings/code/{code}/status:
 *   post:
 *     summary: Cập nhật trạng thái đơn theo mã
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: code
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
 *               payment_status: { type: string, example: unpaid }
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post("/code/:code/status", updateBookingStatus);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Lấy chi tiết đơn đặt
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết đơn
 *       404:
 *         description: Không tìm thấy
 */
router.get("/:id", getBookingDetail);

/**
 * @swagger
 * /bookings:
 *   post:
 *     summary: Tạo đơn đặt phòng
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hotel_id: { type: string }
 *               room_id: { type: string }
 *               checkin_date: { type: string }
 *               checkout_date: { type: string }
 *               customer_name: { type: string }
 *               guest_email: { type: string }
 *               guest_phone: { type: string }
 *     responses:
 *       201:
 *         description: Đặt phòng thành công
 */
router.post("/", createBooking);

/**
 * @swagger
 * /bookings/{id}/cancel:
 *   post:
 *     summary: Hủy đơn đặt phòng
 *     tags: [Bookings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Đã hủy đơn
 */
router.post("/:id/cancel", cancelBooking);

module.exports = router;
