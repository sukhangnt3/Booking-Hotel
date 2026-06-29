const express = require("express");
const { listHotels } = require("../controllers/hotel.controller");

const router = express.Router();

router.get("/", listHotels);

module.exports = router;
