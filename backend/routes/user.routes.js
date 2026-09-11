// backend/routes/user.routes.js
const express = require("express");
const { getProfile, updateProfile } = require("../controllers/user.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

module.exports = router;
