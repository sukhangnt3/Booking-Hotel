const express = require("express");
const {
  addFavorite,
  listFavorites,
  removeFavorite,
} = require("../controllers/favorite.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", listFavorites);
router.post("/:hotelId", addFavorite);
router.delete("/:hotelId", removeFavorite);

module.exports = router;
