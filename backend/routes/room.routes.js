const express = require("express");
const { getRoomById } = require("../controllers/room.controller");

const router = express.Router();

router.get("/:id", getRoomById);

module.exports = router;
