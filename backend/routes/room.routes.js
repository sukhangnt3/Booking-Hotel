const express = require("express");
const router = express.Router();
const roomController = require("../controllers/room.controller");

// ─── 1. CÁC ROUTE PHÒNG VẬT LÝ (ROOM UNITS) ───
// Đặt trước /:id để Express không nhầm "units" là một id
router.get("/units", roomController.listRoomUnits);
router.post("/units", roomController.upsertRoomUnit);
router.delete("/units/:id", roomController.deleteRoomUnit);

// ─── 2. CÁC ROUTE TIỆN NGHI & KHÓA PHÒNG ───
router.get("/amenities", roomController.listMasterAmenities);
router.post("/locks", roomController.createTemporaryLock);
router.delete("/locks/:lockId", roomController.releaseTemporaryLock);

// ─── 3. CÁC ROUTE THEO ID PHÒNG ───
router.get("/:id/amenities", roomController.listRoomAmenities);
router.get("/:id/inventory", roomController.getRoomInventory);
router.put("/:id/inventory", roomController.updateRoomInventory);
router.get("/:id", roomController.getRoomById);

// ─── 4. CÁC ROUTE CRUD HẠNG PHÒNG ───
router.get("/", roomController.listRooms);
router.post("/", roomController.createRoom);
router.put("/:id", roomController.updateRoom);
router.delete("/:id", roomController.deleteRoom);

module.exports = router;
