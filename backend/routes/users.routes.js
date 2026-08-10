const express = require("express");
const { listUserFavorites } = require("../controllers/favorite.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/favorites", listUserFavorites);

module.exports = router;