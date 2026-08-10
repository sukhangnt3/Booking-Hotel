const express = require("express");
const {
  getHotelById,
  listHotelRooms,
  listHotelRoomAvailability,
  listHotels,
  listDestinationSuggestions,
  searchHotels,
  listPropertyTypes,
  listTrendingDestinations,
  listDiscoverVietnam,
  listUniqueStays,
} = require("../controllers/hotel.controller");
const {
  addFavorite,
  removeFavorite,
} = require("../controllers/favorite.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", listHotels);
router.get("/property-types", listPropertyTypes);
router.get("/trending-destinations", listTrendingDestinations);
router.get("/discover-vietnam", listDiscoverVietnam);
router.get("/unique-stays", listUniqueStays);
router.get("/search", searchHotels);
router.get("/destinations", listDestinationSuggestions);
// ─── Route favorite cụ thể phải đặt TRƯỚC /:id ───
router.post("/:id/favorite", requireAuth, addFavorite);
router.delete("/:id/favorite", requireAuth, removeFavorite);
// ─── optionalAuth: nếu có token thì trả is_favorite, không có thì vẫn hoạt động ───
router.get("/:id", optionalAuth, getHotelById);
router.get("/:id/rooms", listHotelRooms);
router.get("/:id/availability", listHotelRoomAvailability);

module.exports = router;