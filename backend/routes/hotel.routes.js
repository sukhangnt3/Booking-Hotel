const express = require("express");
const {
  getHotelById,
  listHotelRooms,
  listHotels,
  listDestinationSuggestions,
  searchHotels,
} = require("../controllers/hotel.controller");

const router = express.Router();

router.get("/", listHotels);
router.get("/property-types", listPropertyTypes);
router.get("/trending-destinations", listTrendingDestinations);
router.get("/discover-vietnam", listDiscoverVietnam);
router.get("/unique-stays", listUniqueStays);
router.get("/search", searchHotels);
router.get("/destinations", listDestinationSuggestions);
router.get("/:id", getHotelById);
router.get("/:id/rooms", listHotelRooms);

module.exports = router;
