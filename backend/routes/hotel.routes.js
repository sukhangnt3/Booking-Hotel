// backend/routes/hotel.routes.js
const express = require("express");
const {
  registerHotel,
  getMyHotels,
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
  updateHotel,
} = require("../controllers/hotel.controller");

const {
  addFavorite,
  removeFavorite,
} = require("../controllers/favorite.controller");

const { listHotelReviews } = require("../controllers/review.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// ─── 1. ROUTE ĐỐI TÁC (OWNER) ───
router.post("/register", requireAuth, registerHotel);
router.get("/my-hotels", requireAuth, getMyHotels);
router.put("/:id", requireAuth, updateHotel);
// ─── 2. DANH SÁCH & TÌM KIẾM CÔNG KHAI ───
router.get("/", listHotels);
router.get("/property-types", listPropertyTypes);
router.get("/trending-destinations", listTrendingDestinations);
router.get("/discover-vietnam", listDiscoverVietnam);
router.get("/unique-stays", listUniqueStays);
router.get("/search", searchHotels);
router.get("/destinations", listDestinationSuggestions);

// ─── 3. YÊU THÍCH & ĐÁNH GIÁ ───
router.post("/:id/favorite", requireAuth, addFavorite);
router.delete("/:id/favorite", requireAuth, removeFavorite);
router.get("/:id/reviews", listHotelReviews);

// ─── 4. CHI TIẾT & KIỂM TRA PHÒNG TRỐNG THEO NGÀY ───
router.get("/:id/availability", listHotelRoomAvailability); // 👉 Gọi query tính tồn kho theo ngày
router.get("/:id/rooms", listHotelRooms);
router.get("/:id", optionalAuth, getHotelById);

module.exports = router;
