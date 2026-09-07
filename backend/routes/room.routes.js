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
  // ─── THÊM 2 HÀM NÀY TỪ CONTROLLER ───
  createTemporaryLock,
  releaseTemporaryLock,
} = require("../controllers/room.controller");

const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── 1. ROUTE TĨNH / DANH MỤC (PHẢI ĐẶT TRÊN CÙNG) ───
// Lấy danh sách phòng theo query: GET /api/rooms?hotel_id=...
router.get("/", listRooms);

// Lấy danh mục tiện nghi tổng
router.get("/amenities/master", listMasterAmenities);

// ─── 2. KHÓA GIỮ PHÒNG TẠM THỜI 15 PHÚT (BẢNG 14: TEMPORARY_LOCKS) ───
// (Đặt trước /:id để không bị bắt nhầm tham số)
router.post("/temporary-lock", optionalAuth, createTemporaryLock);
router.delete("/temporary-lock/:lockId", releaseTemporaryLock);

// ─── 3. QUẢN LÝ TỒN KHO & GIÁ THEO NGÀY (BẢNG 7: ROOM_INVENTORY) ───
router.get("/:id/inventory", getRoomInventory);
router.patch("/:id/inventory", requireAuth, updateRoomInventory);

// ─── 4. CHI TIẾT & TIỆN NGHI RIÊNG CỦA PHÒNG ───
router.get("/:id/amenities", listRoomAmenities);
router.get("/:id", getRoomById);

// ─── 5. THAO TÁC CRUD PHÒNG CỦA OWNER (YÊU CẦU ĐĂNG NHẬP) ───
router.post("/", requireAuth, createRoom);
router.put("/:id", requireAuth, updateRoom);
router.delete("/:id", requireAuth, deleteRoom);

module.exports = router;
