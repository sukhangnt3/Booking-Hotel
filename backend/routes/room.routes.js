const express = require("express");
const {
	getRoomById,
	listRoomAmenities,
	updateRoomInventory,
} = require("../controllers/room.controller");

const router = express.Router();

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Lấy chi tiết phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID phòng
 *     responses:
 *       200:
 *         description: Chi tiết phòng
 *       404:
 *         description: Không tìm thấy
 */
router.get("/:id", getRoomById);

/**
 * @swagger
 * /rooms/{id}/amenities:
 *   get:
 *     summary: Lấy danh sách tiện nghi phòng
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách tiện nghi
 */
router.get("/:id/amenities", listRoomAmenities);

/**
 * @swagger
 * /rooms/{id}/inventory:
 *   put:
 *     summary: Cập nhật tồn kho phòng
 *     tags: [Rooms]
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
 *               inventoryDate:
 *                 type: string
 *                 description: Ngày cập nhật (YYYY-MM-DD)
 *               startDate:
 *                 type: string
 *                 description: Ngày bắt đầu (YYYY-MM-DD, nếu cập nhật khoảng)
 *               endDate:
 *                 type: string
 *                 description: Ngày kết thúc (YYYY-MM-DD)
 *               availableCount:
 *                 type: number
 *                 description: Số lượng phòng có sẵn
 *               soldCount:
 *                 type: number
 *                 description: Số lượng đã bán
 *               lockedCount:
 *                 type: number
 *                 description: Số lượng tạm khóa
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:id/inventory", updateRoomInventory);

module.exports = router;
