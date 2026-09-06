// backend/routes/room.routes.js
const express = require("express");
const {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  listRoomAmenities,
  listMasterAmenities,
  getRoomInventory,
  updateRoomInventory,
} = require("../controllers/room.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// 1. Lấy danh sách phòng theo query: GET /api/rooms?hotel_id=...
router.get("/", listRooms);

// 2. Lấy danh mục tiện nghi tổng
router.get("/amenities/master", listMasterAmenities);

// 3. Thao tác CRUD phòng của Owner
router.post("/", requireAuth, createRoom);
router.put("/:id", requireAuth, updateRoom);
router.delete("/:id", requireAuth, deleteRoom);

// 4. Chi tiết phòng & Tiện nghi riêng
router.get("/:id", getRoomById);
router.get("/:id/amenities", listRoomAmenities);

// 5. Quản lý Tồn kho & Giá theo ngày (Bảng 7: room_inventory)
router.get("/:id/inventory", getRoomInventory);
router.patch("/:id/inventory", requireAuth, updateRoomInventory);

module.exports = router;
