const express = require("express");
const {
	getRoomById,
	listRoomAmenities,
	updateRoomInventory,
} = require("../controllers/room.controller");

const router = express.Router();

router.get("/:id", getRoomById);
router.get("/:id/amenities", listRoomAmenities);
router.put("/:id/inventory", updateRoomInventory);

module.exports = router;
