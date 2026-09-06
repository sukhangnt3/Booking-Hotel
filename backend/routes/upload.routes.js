// backend/routes/upload.routes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Tự động tạo thư mục uploads nếu chưa tồn tại
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "avatar-" + uniqueSuffix + ext);
  },
});

// Bộ lọc chỉ chấp nhận định dạng ảnh
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Chỉ chấp nhận file định dạng hình ảnh (jpg, png, webp, jpeg)!",
      ),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // Tối đa 10MB
});

// 1. TẢI 1 ẢNH DUY NHẤT (AVATAR) -> POST /api/uploads/single
router.post("/single", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Không tìm thấy file ảnh tải lên." });
  }

  // Tự động sinh Full URL (Ví dụ: http://localhost:5000/uploads/avatar-xxx.jpg)
  const host = req.get("host");
  const protocol = req.protocol;
  const fullUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  return res.json({
    success: true,
    message: "Tải ảnh lên thành công!",
    url: fullUrl,
    path: fullUrl,
    filename: req.file.filename,
  });
});

// 2. TẢI NHIỀU ẢNH CÙNG LÚC -> POST /api/uploads/multiple
router.post("/multiple", upload.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Không tìm thấy danh sách file tải lên.",
      });
  }

  const host = req.get("host");
  const protocol = req.protocol;
  const fullUrls = req.files.map(
    (file) => `${protocol}://${host}/uploads/${file.filename}`,
  );

  return res.json({
    success: true,
    message: `Đã tải lên thành công ${req.files.length} ảnh!`,
    urls: fullUrls,
    files: req.files,
  });
});

module.exports = router;
