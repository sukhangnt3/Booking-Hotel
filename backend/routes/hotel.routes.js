const express = require("express");
const {
  getHotelById,
  listHotelRooms,
  listHotels,
} = require("../controllers/hotel.controller");

const router = express.Router();

router.get("/", listHotels);
router.get("/:id", getHotelById);
router.get("/:id/rooms", listHotelRooms);

module.exports = router;
