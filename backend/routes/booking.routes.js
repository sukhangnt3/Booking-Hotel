const express = require("express");
const {
  createBooking,
  createTemporaryLock,
  getBookingDetail,
  cancelBooking,
  updateBookingStatus,
  listMyBookings,
} = require("../controllers/booking.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.post("/temp-lock", createTemporaryLock);
router.get("/my", listMyBookings);
// ─── Route cụ thể phải đặt TRƯỚC route động /:id ───
router.post("/code/:code/status", updateBookingStatus);
router.get("/:id", getBookingDetail);
router.post("/", createBooking);
router.post("/:id/cancel", cancelBooking);

module.exports = router;
