const express = require("express");
const {
	profile,
	googleLogin,
	login,
	register,
	updateProfile,
	changePassword,
} = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/google-login", googleLogin);
router.post("/login", login);
router.post("/register", register);
router.get("/profile", requireAuth, profile);
router.put("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);

module.exports = router;
