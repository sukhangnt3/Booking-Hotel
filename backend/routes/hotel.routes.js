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
const { listHotelReviews } = require("../controllers/review.controller");
const { requireAuth, optionalAuth } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * @swagger
 * /hotels:
 *   get:
 *     summary: Lấy danh sách khách sạn
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Danh sách khách sạn
 */
router.get("/", listHotels);

/**
 * @swagger
 * /hotels/property-types:
 *   get:
 *     summary: Lấy loại chỗ nghỉ
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Danh sách loại chỗ nghỉ
 */
router.get("/property-types", listPropertyTypes);

/**
 * @swagger
 * /hotels/trending-destinations:
 *   get:
 *     summary: Điểm đến thịnh hành
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Danh sách điểm đến
 */
router.get("/trending-destinations", listTrendingDestinations);

/**
 * @swagger
 * /hotels/discover-vietnam:
 *   get:
 *     summary: Khám phá Việt Nam
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Danh sách điểm đến Việt Nam
 */
router.get("/discover-vietnam", listDiscoverVietnam);

/**
 * @swagger
 * /hotels/unique-stays:
 *   get:
 *     summary: Chỗ nghỉ độc đáo
 *     tags: [Hotels]
 *     responses:
 *       200:
 *         description: Danh sách chỗ nghỉ độc đáo
 */
router.get("/unique-stays", listUniqueStays);

/**
 * @swagger
 * /hotels/search:
 *   get:
 *     summary: Tìm kiếm khách sạn
 *     tags: [Hotels]
 *     parameters:
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *         description: Điểm đến / thành phố
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *         description: Giá tối đa
 *       - in: query
 *         name: stars
 *         schema: { type: string }
 *         description: Số sao (vd 4 hoặc 5)
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 */
router.get("/search", searchHotels);

/**
 * @swagger
 * /hotels/destinations:
 *   get:
 *     summary: Gợi ý địa điểm
 *     tags: [Hotels]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Từ khóa
 *     responses:
 *       200:
 *         description: Danh sách gợi ý
 */
router.get("/destinations", listDestinationSuggestions);

/**
 * @swagger
 * /hotels/{id}/favorite:
 *   post:
 *     summary: Thêm khách sạn vào yêu thích
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Đã thêm yêu thích
 *   delete:
 *     summary: Bỏ yêu thích khách sạn
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Đã bỏ yêu thích
 */
router.post("/:id/favorite", requireAuth, addFavorite);
router.delete("/:id/favorite", requireAuth, removeFavorite);

/**
 * @swagger
 * /hotels/{id}/reviews:
 *   get:
 *     summary: Lấy đánh giá của khách sạn
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách đánh giá
 */
router.get("/:id/reviews", listHotelReviews);

/**
 * @swagger
 * /hotels/{id}:
 *   get:
 *     summary: Lấy chi tiết khách sạn
 *     tags: [Hotels]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Chi tiết khách sạn
 *       404:
 *         description: Không tìm thấy
 */
router.get("/:id", optionalAuth, getHotelById);

/**
 * @swagger
 * /hotels/{id}/rooms:
 *   get:
 *     summary: Lấy danh sách phòng của khách sạn
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách phòng
 */
router.get("/:id/rooms", listHotelRooms);

/**
 * @swagger
 * /hotels/{id}/availability:
 *   get:
 *     summary: Kiểm tra phòng trống
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: checkIn
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: checkOut
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Danh sách phòng trống
 */
router.get("/:id/availability", listHotelRoomAvailability);

module.exports = router;
