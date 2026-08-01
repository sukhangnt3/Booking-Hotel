const express = require("express");
const {
  createBooking,
  createTemporaryLock,
  getBookingDetail,
  cancelBooking,
  listMyBookings,
} = require("../controllers/booking.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.post("/temp-lock", createTemporaryLock);
router.get("/my", listMyBookings);
router.get("/:id", getBookingDetail);
router.post("/", createBooking);
router.post("/:id/cancel", cancelBooking);

module.exports = router;
