const express = require("express");
const {
  createReview,
  listHotelReviews,
} = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/hotel/:hotelId", listHotelReviews);
router.post("/", requireAuth, createReview);

module.exports = router;
