// backend/routes/index.js

const express = require("express");
const router = express.Router();

const reviewController = require("../controllers/review.controller");
const { requireAuth } = require("../middleware/auth.middleware");

/* ============================================================
   LOAD ROUTE HELPER
   ============================================================ */

const safeUse = (mountPath, relativePath) => {
  try {
    const routeModule = require(relativePath);

    router.use(mountPath, routeModule);

    console.log(`✓ Route [${mountPath}] loaded from ${relativePath}`);
  } catch (err) {
    console.error(`❌ Route [${mountPath}] FAILED:`, err);
  }
};

/* ============================================================
   SYSTEM ROUTES
   ============================================================ */

safeUse("/users", "./user.routes");
safeUse("/auth", "./auth.routes");
safeUse("/hotels", "./hotel.routes");
safeUse("/rooms", "./room.routes");
safeUse("/bookings", "./booking.routes");
safeUse("/owner", "./owner.routes");
safeUse("/payments", "./payment.routes");
safeUse("/favorites", "./favorite.routes");
safeUse("/reviews", "./review.routes");
safeUse("/chatbot", "./chatbot.routes");

/* ============================================================
   ADMIN ROUTES
   ============================================================ */

try {
  const adminRoutes = require("./admin.routes");

  router.use("/admin", adminRoutes);

  console.log("✓ Route [/admin] loaded from ./admin.routes");
} catch (error1) {
  try {
    const adminRoutesAlt = require("../admin/admin.routes");

    router.use("/admin", adminRoutesAlt);

    console.log("✓ Route [/admin] loaded from ../admin/admin.routes");
  } catch (error2) {
    console.error("❌ Cannot load admin.routes:", error1.message);
  }
}

/* ============================================================
   REVIEW ROUTES
   ============================================================ */

if (typeof reviewController?.listHotelReviews === "function") {
  router.get("/hotels/:id/reviews", reviewController.listHotelReviews);

  router.get("/hotels/:hotelId/reviews", reviewController.listHotelReviews);
}

if (
  typeof reviewController?.checkCanReview === "function" &&
  typeof requireAuth === "function"
) {
  router.get(
    "/hotels/:id/can-review",
    requireAuth,
    reviewController.checkCanReview,
  );

  router.get(
    "/hotels/:hotelId/can-review",
    requireAuth,
    reviewController.checkCanReview,
  );
}

if (
  typeof reviewController?.createReview === "function" &&
  typeof requireAuth === "function"
) {
  router.post(
    "/hotels/:id/reviews",
    requireAuth,
    reviewController.createReview,
  );

  router.post(
    "/hotels/:hotelId/reviews",
    requireAuth,
    reviewController.createReview,
  );
}

/* ============================================================
   HEALTH CHECK
   ============================================================ */

router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

/* ============================================================
   EXPORT
   ============================================================ */

module.exports = router;
