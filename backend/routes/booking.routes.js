const express = require("express");
const {
  createBooking,
  listMyBookings,
} = require("../controllers/booking.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/my", listMyBookings);
router.post("/", createBooking);

module.exports = router;
