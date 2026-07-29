const express = require("express");
const {
	profile,
	googleLogin,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/google-login", googleLogin);
router.get("/profile", requireAuth, profile);

module.exports = router;
