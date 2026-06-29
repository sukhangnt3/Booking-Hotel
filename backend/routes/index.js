const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const hotelRoutes = require("./hotel.routes");
const { login, register } = require("../controllers/auth.controller");

const router = express.Router();

router.use(healthRoutes);
router.use("/auth", authRoutes);
router.use("/hotels", hotelRoutes);

// Backward compatibility for older frontend components.
router.post("/register", register);
router.post("/login", login);

module.exports = router;
