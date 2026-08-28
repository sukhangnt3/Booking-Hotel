const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/database");

// ─── 1. ĐĂNG KÝ ĐỐI TÁC ───
async function registerPartner(req, res, next) {
  const {
    ownerName, phoneContact, emailContact, password,
    hotelNameVi, hotelNameEn, hotelType, starRating,
    description, province, district, ward, streetAddress,
    latitude, longitude, rooms = [], hotelImages = [],
    signerName, signerPhone, signerEmail, signerPosition,
    signerIdNumber, taxCode, bankCode, bankName,
    bankAccount, bankAccountName, bankBranch,
    payoutCycle, commissionRate,
    checkInFrom, checkInTo, checkOutFrom, checkOutTo,
    cancellationPolicy, allowChildren, allowPets,
    legalDocuments = [],
  } = req.body;

  if (!emailContact || !password) {
    return res.status(400).json({ message: "Email và mật khẩu là bắt buộc." });
  }
  if (!hotelNameVi && !hotelNameEn) {
    return res.status(400).json({ message: "Tên chỗ nghỉ là bắt buộc." });
  }
  if (!rooms || rooms.length === 0) {
    return res.status(400).json({ message: "Cần ít nhất 1 loại phòng." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Kiểm tra email tồn tại
    const emailCheck = await client.query(
      `SELECT id FROM users WHERE email = LOWER($1) LIMIT 1`,
      [emailContact.trim().toLowerCase()]
    );
    if (emailCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Email này đã được sử dụng." });
    }

    // 2. Tạo user owner
    const hashedPassword = await bcrypt.hash(password, 10);
    const ownerId = crypto.randomUUID();
    await client.query(
      `INSERT INTO users (id, full_name, email, password, phone, activate)
       VALUES ($1, $2, LOWER($3), $4, $5, true)`,
      [ownerId, ownerName?.trim() || signerName?.trim() || "Owner",
       emailContact.trim(), hashedPassword, phoneContact?.trim() || signerPhone?.trim()]
    );

    // 3. Gán role owner
    const roleRes = await client.query(
      `INSERT INTO roles (name) VALUES ('owner')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`, []
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
      [ownerId, roleRes.rows[0].id]
    );

    // 4. Tạo hotel với status = 'pending'
    const hotelId = crypto.randomUUID();
    const hotelName = hotelNameVi || hotelNameEn;
    await client.query(
      `INSERT INTO hotel (
        id, owner_id, name, address, city, latitude, longitude,
        description, star_rating, email, phone,
        contact_name, contact_phone,
        tax_code, bank_name, bank_account, bank_account_holder,
        commission_rate, payout_cycle,
        status, average_rating, review_count,
        created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'pending'::hotel_status_enum,0,0,$20,NOW(),NOW())`,
      [hotelId, ownerId, hotelName,
       [streetAddress, ward, district].filter(Boolean).join(", "),
       province || district, latitude || 0, longitude || 0,
       description, starRating || 3, emailContact, phoneContact,
       signerName, signerPhone,
       taxCode, bankName, bankAccount, bankAccountName,
       commissionRate || 18, payoutCycle || "weekly", ownerId]
    );

    // 5. Tạo các loại phòng
    for (const room of rooms) {
      const roomId = crypto.randomUUID();
      await client.query(
        `INSERT INTO room (id, hotel_id, name, type, bed_type, room_area,
         capacity, base_price, amount, is_active, created_by, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10,NOW(),NOW())`,
        [roomId, hotelId,
         room.roomName || room.name || "Phòng",
         room.type || "standard",
         room.bedType || room.bed_type || "1 Giường đôi",
         room.roomSize || room.room_size || 28,
         (room.maxAdults || 2) + (room.maxChildren || 0),
         room.weekdayPrice || room.price || 0,
         room.totalRooms || room.total_rooms || 1,
         ownerId]
      );

      // Tạo số phòng (bỏ qua - admin/owner sẽ thêm sau qua RoomNumberPage)
    }

    // 6. Lưu ảnh
    for (const img of hotelImages) {
      if (img.preview) {
        await client.query(
          `INSERT INTO image (room_id, hotel_id, path, is_thumbnail)
           VALUES (NULL, $1, $2, $3)`,
          [hotelId, img.preview, img.isThumbnail || false]
        );
      }
    }

    // 7. Lưu policy
    await client.query(
      `INSERT INTO policy (
        hotel_id, start_checkin_time, end_checkin_time,
        start_checkout_time, end_checkout_time,
        free_cancellation, cancellation_deadline_hours,
        children_allowed, animal_allowed, created_by, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,24,$7,$8,$9,NOW(),NOW())`,
      [hotelId,
       checkInFrom || "14:00", checkInTo || "23:59",
       checkOutFrom || "06:00", checkOutTo || "12:00",
       cancellationPolicy?.includes("free") || cancellationPolicy?.includes("flexible"),
       allowChildren === "yes", allowPets === "yes",
       ownerId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Đăng ký đối tác thành công! Hồ sơ đang chờ duyệt.",
      applicationId: `GST-${hotelId.slice(0, 6).toUpperCase()}`,
      hotelId, ownerId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Lỗi registerPartner:", error);
    return next(error);
  } finally {
    client.release();
  }
}

module.exports = { registerPartner };
