const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// ======================================================
// CẤU HÌNH KẾT NỐI CLOUDINARY
// ======================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ======================================================
// CẤU HÌNH STORAGE LƯU TRỰC TIẾP LÊN CLOUD
// ======================================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "gostay_avatars", // Tên thư mục trên Cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 500, height: 500, crop: "limit" }], // Tự động resize tối ưu dung lượng ảnh
    public_id: (req, file) => {
      const userId = req.auth?.sub || req.auth?.id || req.user?.id || "user";
      return `avatar-${userId}-${Date.now()}`;
    },
  },
});

// ======================================================
// KIỂM TRA LOẠI FILE
// ======================================================
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP hoặc GIF."), false);
  }
};

// ======================================================
// MULTER MIDDLEWARE
// ======================================================
const uploadAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
  },
});

module.exports = uploadAvatar;
