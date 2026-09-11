// backend/controllers/user.controller.js
const pool = require("../config/database");

// ─── 1. LẤY HỒ SƠ TỪ DATABASE ───
const getProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;

    const result = await pool.query(
      `SELECT id, full_name, email, phone, dob, avatar, email_verified, phone_verified, activate, last_login, created_at, updated_at 
       FROM public.users 
       WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy người dùng." });
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Lỗi getProfile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi server khi lấy hồ sơ." });
  }
};

// ─── 2. CẬP NHẬT TRỰC TIẾP VÀO POSTGRESQL ───
const updateProfile = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { full_name, phone, dob } = req.body;

    if (!full_name || !full_name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Họ và tên là bắt buộc." });
    }

    // Xử lý dob: nếu rỗng phải là null để PostgreSQL không báo lỗi date
    const cleanDob =
      dob && String(dob).trim() !== "" ? String(dob).trim() : null;
    const cleanPhone =
      phone && String(phone).trim() !== "" ? String(phone).trim() : null;

    // Ghi trực tiếp vào PostgreSQL
    const updateResult = await pool.query(
      `UPDATE public.users 
       SET full_name = $1, 
           phone = $2, 
           dob = $3, 
           updated_at = NOW() 
       WHERE id = $4 
       RETURNING id, full_name, email, phone, dob, avatar, email_verified, phone_verified, activate, last_login, created_at, updated_at`,
      [full_name.trim(), cleanPhone, cleanDob, userId],
    );

    if (updateResult.rows.length === 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy người dùng để cập nhật.",
        });
    }

    console.log(
      "✅ Đã cập nhật thành công vào Database PostgreSQL cho user:",
      userId,
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công vào Database!",
      user: updateResult.rows[0],
    });
  } catch (error) {
    console.error("❌ Lỗi updateProfile SQL:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Lỗi cập nhật CSDL.",
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
