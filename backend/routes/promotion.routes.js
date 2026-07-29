const express = require("express");
const { listPromotions } = require("../controllers/promotion.controller");

const router = express.Router();

router.get("/", listPromotions);

module.exports = router;
