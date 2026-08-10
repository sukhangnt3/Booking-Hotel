const express = require("express");
const { createVnpayUrl, vnpayReturn } = require("../controllers/payment.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/create-vnpay-url", requireAuth, createVnpayUrl);
router.get("/vnpay-return", vnpayReturn);

module.exports = router;