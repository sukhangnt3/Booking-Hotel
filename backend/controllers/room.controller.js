// backend/controllers/room.controller.js
const crypto = require("crypto");
const pool = require("../config/database");
const { formatRoom } = require("../utils/formatters");

// ─── 1. LẤY DANH SÁCH PHÒNG THEO KHÁCH SẠN ───
async function listRooms(req, res, next) {
  try {
    const hotelId = req.query.hotel_id || req.params.hotelId || req.params.id;

    if (!hotelId) {
      return res.status(400).json({ message: "hotel_id là bắt buộc." });
    }

    const result = await pool.query(
      `SELECT
         r.id,
         r.hotel_id,
         r.name,
         r.capacity,
         r.base_price,
         -- Nếu trong DB là 0 hoặc null thì tự tính = 25% giá ngày
         COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
         -- Nếu trong DB là 0 hoặc null thì lấy bằng giá ngày
         COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
         COALESCE(r.early_checkin_fee, 0) AS early_checkin_fee,
         COALESCE(r.late_checkout_fee, 0) AS late_checkout_fee,
         r.description,
         r.type,
         r.bed_type,
         r.room_area,
         r.amount,
         r.is_active,
         (
           SELECT img.path 
           FROM public.image img 
           WHERE img.room_id = r.id 
           ORDER BY img.is_thumbnail DESC, img.display_order ASC 
           LIMIT 1
         ) AS thumbnail,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
       FROM public.room r
       LEFT JOIN public.room_amenity ra ON ra.room_id = r.id
       LEFT JOIN public.amenity a ON a.id = ra.amenity_id
       WHERE r.hotel_id::text = $1 AND r.is_active = true
       GROUP BY r.id
       ORDER BY r.base_price ASC, r.created_at DESC`,
      [hotelId],
    );

    // Đảm bảo không bị formatRoom làm mất hourly_price và overnight_price
    const formattedRooms = result.rows.map((row) => {
      const formatted = formatRoom ? formatRoom(row) : {};
      return {
        ...row,
        ...formatted,
        hourly_price: Number(
          row.hourly_price || Math.round(row.base_price * 0.25),
        ),
        overnight_price: Number(row.overnight_price || row.base_price),
      };
    });

    return res.json({
      success: true,
      data: formattedRooms,
      rooms: formattedRooms,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("❌ LỖI LIST_ROOMS:", error);
    return next(error);
  }
}

// ─── 2. LẤY CHI TIẾT PHÒNG THEO ID ───
async function getRoomById(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         r.id,
         r.hotel_id,
         r.name,
         r.capacity,
         r.base_price,
         COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
         COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
         COALESCE(r.early_checkin_fee, 0) AS early_checkin_fee,
         COALESCE(r.late_checkout_fee, 0) AS late_checkout_fee,
         r.description,
         r.type,
         r.bed_type,
         r.room_area,
         r.amount,
         r.is_active,
         (
           SELECT img.path 
           FROM public.image img 
           WHERE img.room_id = r.id 
           ORDER BY img.is_thumbnail DESC, img.display_order ASC 
           LIMIT 1
         ) AS thumbnail,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
       FROM public.room r
       LEFT JOIN public.room_amenity ra ON ra.room_id = r.id
       LEFT JOIN public.amenity a ON a.id = ra.amenity_id
       WHERE r.id::text = $1
       GROUP BY r.id`,
      [req.params.id],
    );

    const room = result.rows[0];
    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }

    const formatted = formatRoom ? formatRoom(room) : {};
    const finalRoom = {
      ...room,
      ...formatted,
      hourly_price: Number(
        room.hourly_price || Math.round(room.base_price * 0.25),
      ),
      overnight_price: Number(room.overnight_price || room.base_price),
    };

    return res.json({
      success: true,
      data: finalRoom,
      room: finalRoom,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 3. TẠO HẠNG PHÒNG MỚI (LƯU CHÍNH XÁC CÁC MỨC GIÁ) ───
async function createRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      hotel_id,
      name,
      capacity,
      base_price,
      hourly_price,
      overnight_price,
      early_checkin_fee,
      late_checkout_fee,
      amount,
      type,
      bed_type,
      room_area,
      description,
      image,
      amenities = [],
    } = req.body;

    if (!hotel_id || !name || !base_price) {
      return res.status(400).json({
        message: "hotel_id, tên phòng và giá phòng (base_price) là bắt buộc.",
      });
    }

    await client.query("BEGIN");

    const newRoomId = crypto.randomUUID();
    const parsedBasePrice = Number(base_price);

    // Tính giá chuẩn xác: nếu người dùng không nhập hoặc nhập 0 thì tự tính
    const parsedHourlyPrice =
      Number(hourly_price) > 0
        ? Number(hourly_price)
        : Math.round(parsedBasePrice * 0.25);

    const parsedOvernightPrice =
      Number(overnight_price) > 0 ? Number(overnight_price) : parsedBasePrice;

    const parsedEarlyFee = Number(early_checkin_fee || 0);
    const parsedLateFee = Number(late_checkout_fee || 0);

    const result = await client.query(
      `INSERT INTO public.room (
         id, hotel_id, name, capacity, base_price, hourly_price, overnight_price,
         early_checkin_fee, late_checkout_fee, amount, type, bed_type, room_area,
         description, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW())
       RETURNING *`,
      [
        newRoomId,
        hotel_id,
        name.trim(),
        Number(capacity || 2),
        parsedBasePrice,
        parsedHourlyPrice,
        parsedOvernightPrice,
        parsedEarlyFee,
        parsedLateFee,
        Number(amount || 1),
        type || "Tiêu chuẩn",
        bed_type || "1 Giường đôi King",
        Number(room_area || 25),
        description || null,
      ],
    );

    const newRoom = result.rows[0];

    // Tạo danh sách phòng vật lý tự động
    for (let i = 1; i <= Number(amount || 1); i++) {
      await client
        .query(
          `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 'available', NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [
            hotel_id,
            newRoom.id,
            `P.${newRoom.name.substring(0, 3).toUpperCase()}-${i}`,
          ],
        )
        .catch(() => {});
    }

    // Ảnh
    if (image) {
      await client.query(
        `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
         VALUES (gen_random_uuid(), NULL, $1, $2, true, 0, NOW())`,
        [newRoom.id, image],
      );
    }

    // Tiện nghi
    if (Array.isArray(amenities) && amenities.length > 0) {
      for (const amenityName of amenities) {
        if (!amenityName || !String(amenityName).trim()) continue;
        const cleanName = String(amenityName).trim();

        let amenRes = await client.query(
          `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
          [cleanName],
        );
        let amenId = amenRes.rows[0]?.id;

        if (!amenId) {
          const insertAmen = await client.query(
            `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`,
            [cleanName],
          );
          amenId = insertAmen.rows[0]?.id;
        }

        if (amenId) {
          await client.query(
            `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newRoom.id, amenId],
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Tạo hạng phòng thành công!",
      room: newRoom,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI CREATE_ROOM:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 4. CẬP NHẬT HẠNG PHÒNG (SỬA ĐƯỢC MỌI GIÁ VÀ LƯU CHÍNH XÁC) ───
async function updateRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      name,
      capacity,
      base_price,
      hourly_price,
      overnight_price,
      early_checkin_fee,
      late_checkout_fee,
      amount,
      type,
      bed_type,
      room_area,
      description,
      image,
      amenities,
    } = req.body;

    await client.query("BEGIN");

    // Lấy thông tin phòng hiện tại trong DB
    const currentRes = await client.query(
      `SELECT * FROM public.room WHERE id::text = $1`,
      [id],
    );
    if (currentRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }
    const currentRoom = currentRes.rows[0];

    const finalBasePrice = base_price
      ? Number(base_price)
      : currentRoom.base_price;

    // Nếu có truyền hourly_price thì lấy, nếu không thì lấy giá cũ (hoặc tính 25% giá ngày)
    let finalHourlyPrice = currentRoom.hourly_price;
    if (
      hourly_price !== undefined &&
      hourly_price !== null &&
      hourly_price !== ""
    ) {
      finalHourlyPrice = Number(hourly_price);
    }
    if (!finalHourlyPrice || finalHourlyPrice <= 0) {
      finalHourlyPrice = Math.round(finalBasePrice * 0.25);
    }

    // Nếu có truyền overnight_price thì lấy, nếu không thì lấy giá cũ (hoặc lấy bằng giá ngày)
    let finalOvernightPrice = currentRoom.overnight_price;
    if (
      overnight_price !== undefined &&
      overnight_price !== null &&
      overnight_price !== ""
    ) {
      finalOvernightPrice = Number(overnight_price);
    }
    if (!finalOvernightPrice || finalOvernightPrice <= 0) {
      finalOvernightPrice = finalBasePrice;
    }

    const finalEarlyFee =
      early_checkin_fee !== undefined &&
      early_checkin_fee !== null &&
      early_checkin_fee !== ""
        ? Number(early_checkin_fee)
        : currentRoom.early_checkin_fee;

    const finalLateFee =
      late_checkout_fee !== undefined &&
      late_checkout_fee !== null &&
      late_checkout_fee !== ""
        ? Number(late_checkout_fee)
        : currentRoom.late_checkout_fee;

    const result = await client.query(
      `UPDATE public.room
       SET name = COALESCE($1, name),
           capacity = COALESCE($2, capacity),
           base_price = $3,
           hourly_price = $4,
           overnight_price = $5,
           early_checkin_fee = $6,
           late_checkout_fee = $7,
           amount = COALESCE($8, amount),
           type = COALESCE($9, type),
           bed_type = COALESCE($10, bed_type),
           room_area = COALESCE($11, room_area),
           description = COALESCE($12, description),
           updated_at = NOW()
       WHERE id::text = $13
       RETURNING *`,
      [
        name,
        capacity ? Number(capacity) : null,
        finalBasePrice,
        finalHourlyPrice,
        finalOvernightPrice,
        finalEarlyFee,
        finalLateFee,
        amount ? Number(amount) : null,
        type,
        bed_type,
        room_area ? Number(room_area) : null,
        description,
        id,
      ],
    );

    if (image) {
      const updateImgRes = await client.query(
        `UPDATE public.image SET path = $1 WHERE room_id::text = $2 AND is_thumbnail = true`,
        [image, id],
      );

      if (updateImgRes.rowCount === 0) {
        await client.query(
          `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
           VALUES (gen_random_uuid(), NULL, $1, $2, true, 0, NOW())`,
          [id, image],
        );
      }
    }

    if (Array.isArray(amenities)) {
      await client.query(
        `DELETE FROM public.room_amenity WHERE room_id::text = $1`,
        [id],
      );
      for (const amenityName of amenities) {
        if (!amenityName || !String(amenityName).trim()) continue;
        const cleanName = String(amenityName).trim();

        let amenRes = await client.query(
          `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
          [cleanName],
        );
        let amenId = amenRes.rows[0]?.id;
        if (!amenId) {
          const insertAmen = await client.query(
            `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`,
            [cleanName],
          );
          amenId = insertAmen.rows[0]?.id;
        }
        if (amenId) {
          await client.query(
            `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [id, amenId],
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cập nhật phòng thành công!",
      room: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI UPDATE_ROOM:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 5. XÓA HOẶC CHUYỂN SANG NGỪNG KINH DOANH PHÒNG (AN TOÀN TUYỆT ĐỐI) ───
async function deleteRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    // 1. Kiểm tra xem phòng có phát sinh lịch sử đặt phòng nào chưa
    const checkBooking = await client.query(
      `SELECT id FROM public.booking_room WHERE room_id::text = $1 LIMIT 1`,
      [id],
    );

    // Nếu đã có khách đặt: chuyển sang ngừng kinh doanh để giữ dữ liệu kế toán/thống kê
    if (checkBooking.rows.length > 0) {
      await client.query(
        `UPDATE public.room SET is_active = false, updated_at = NOW() WHERE id::text = $1`,
        [id],
      );
      return res.json({
        success: true,
        is_soft_deleted: true,
        message:
          "Hạng phòng này đã có lịch sử đặt phòng nên được chuyển sang trạng thái 'Ngừng kinh doanh'.",
      });
    }

    // 2. Nếu là phòng mới/chưa có booking: Xóa toàn bộ liên kết để tránh lỗi Foreign Key
    await client.query("BEGIN");
    await client
      .query(`DELETE FROM public.temporary_locks WHERE room_id::text = $1`, [
        id,
      ])
      .catch(() => {});
    await client
      .query(`DELETE FROM public.room_inventory WHERE room_id::text = $1`, [id])
      .catch(() => {});
    await client
      .query(`DELETE FROM public.room_amenity WHERE room_id::text = $1`, [id])
      .catch(() => {});
    await client
      .query(`DELETE FROM public.image WHERE room_id::text = $1`, [id])
      .catch(() => {});
    await client
      .query(`DELETE FROM public.room_unit WHERE room_id::text = $1`, [id])
      .catch(() => {});

    const delRes = await client.query(
      `DELETE FROM public.room WHERE id::text = $1 RETURNING id`,
      [id],
    );
    await client.query("COMMIT");

    if (delRes.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phòng để xóa." });
    }

    return res.json({
      success: true,
      message: "Đã xóa hạng phòng thành công.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI DELETE_ROOM:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 6. LẤY TIỆN NGHI RIÊNG CỦA PHÒNG ───
async function listRoomAmenities(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.name, a.type
       FROM public.room_amenity ra
       JOIN public.amenity a ON a.id = ra.amenity_id
       WHERE ra.room_id::text = $1
       ORDER BY a.name ASC`,
      [req.params.id],
    );
    return res.json({
      success: true,
      data: result.rows,
      amenities: result.rows,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 7. DANH MỤC TIỆN NGHI TỔNG ───
async function listMasterAmenities(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, type FROM public.amenity ORDER BY name ASC`,
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
}

// ─── 8. LẤY TỒN KHO & GIÁ ───
async function getRoomInventory(req, res, next) {
  const roomId = req.params.id;
  const { month, year } = req.query;
  try {
    let whereClause = `WHERE room_id::text = $1`;
    const params = [roomId];
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      whereClause += ` AND inventory_date >= $2::date AND inventory_date <= ($2::date + INTERVAL '1 month' - INTERVAL '1 day')`;
      params.push(startDate);
    }
    const result = await pool.query(
      `SELECT id, room_id, inventory_date, available_count, sold_count, base_price, sell_price, status
       FROM public.room_inventory ${whereClause} ORDER BY inventory_date ASC`,
      params,
    );
    return res.json({
      success: true,
      data: result.rows,
      inventory: result.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 9. CẬP NHẬT TỒN KHO & GIÁ ───
async function updateRoomInventory(req, res, next) {
  const roomId = req.params.id;
  const inventoryDate = req.body.inventoryDate || req.body.date;
  const availableCount = Number(
    req.body.availableCount ?? req.body.available_count ?? 0,
  );
  const sellPrice = Number(req.body.sellPrice ?? req.body.sell_price ?? 500000);
  const basePrice = Number(
    req.body.basePrice ?? req.body.base_price ?? sellPrice,
  );
  const status = req.body.status || "active";

  if (!inventoryDate) {
    return res.status(400).json({ message: "inventoryDate là bắt buộc." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updateRes = await client.query(
      `UPDATE public.room_inventory
       SET available_count = $1, base_price = $2, sell_price = $3, status = $4::public.room_inventory_status_enum, updated_at = NOW()
       WHERE room_id::text = $5 AND inventory_date = $6::date RETURNING *`,
      [availableCount, basePrice, sellPrice, status, roomId, inventoryDate],
    );

    let row = updateRes.rows[0];
    if (!row) {
      const insertRes = await client.query(
        `INSERT INTO public.room_inventory (
           id, room_id, inventory_date, available_count, sold_count, locked_count,
           base_price, sell_price, status, created_at, updated_at
         )
         VALUES (gen_random_uuid(), $1, $2::date, $3, 0, 0, $4, $5, $6::public.room_inventory_status_enum, NOW(), NOW())
         RETURNING *`,
        [roomId, inventoryDate, availableCount, basePrice, sellPrice, status],
      );
      row = insertRes.rows[0];
    }
    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Đã cập nhật tồn kho & giá thành công!",
      data: row,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 10. TẠO KHÓA GIỮ PHÒNG ───
async function createTemporaryLock(req, res, next) {
  const { roomId, checkIn, checkOut, quantity = 1 } = req.body;
  const userId = req.user?.id || null;
  const sessionId = req.headers["x-session-id"] || crypto.randomUUID();

  if (!roomId || !checkIn || !checkOut) {
    return res.status(400).json({ message: "Thiếu thông tin giữ phòng." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const checkQuery = `
      WITH StayNights AS (
        SELECT generate_series($2::date, ($3::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date
      )
      SELECT 
        sn.night_date,
        GREATEST(
          0,
          COALESCE(ri.available_count, r.amount)
          - COALESCE((
              SELECT SUM(br.quantity)::int 
              FROM public.booking_room br
              JOIN public.booking b ON b.id = br.booking_id
              WHERE br.room_id = r.id AND br.book_date = sn.night_date 
                AND b.status IN ('confirmed', 'checked_in', 'pending')
            ), 0)
          - COALESCE((
              SELECT SUM(tl.quantity)::int 
              FROM public.temporary_locks tl
              WHERE tl.room_id = r.id AND tl.lock_date = sn.night_date 
                AND tl.expires_at > NOW()
            ), 0)
        ) AS current_available
      FROM public.room r
      CROSS JOIN StayNights sn
      LEFT JOIN public.room_inventory ri ON ri.room_id = r.id AND ri.inventory_date = sn.night_date
      WHERE r.id::text = $1;
    `;

    const checkRes = await client.query(checkQuery, [
      roomId,
      checkIn,
      checkOut,
    ]);
    const isAvailable = checkRes.rows.every(
      (row) => Number(row.current_available) >= Number(quantity),
    );

    if (!isAvailable) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Phòng vừa có người khác giữ chỗ trước.",
      });
    }

    const lockSessionId = crypto.randomUUID();
    const insertLockQuery = `
      INSERT INTO public.temporary_locks (
        id, room_id, user_id, session_id, lock_date, quantity, lock_expires_at, expires_at, created_at
      )
      SELECT 
        gen_random_uuid(), $1, $2, $3, sn.night_date, $4, 
        NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes', NOW()
      FROM (
        SELECT generate_series($5::date, ($6::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date
      ) sn;
    `;

    await client.query(insertLockQuery, [
      roomId,
      userId,
      lockSessionId,
      quantity,
      checkIn,
      checkOut,
    ]);
    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Giữ phòng thành công!",
      lockId: lockSessionId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

// ─── 11. GIẢI PHÓNG KHÓA GIỮ PHÒNG ───
async function releaseTemporaryLock(req, res, next) {
  const lockId = req.params.lockId || req.body.lockId;
  if (!lockId) return res.json({ success: true });
  try {
    await pool.query(
      `DELETE FROM public.temporary_locks WHERE session_id = $1 OR id::text = $1`,
      [lockId],
    );
    return res.json({ success: true, message: "Đã giải phóng phòng." });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  listRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  listRoomAmenities,
  listMasterAmenities,
  getRoomInventory,
  updateRoomInventory,
  createTemporaryLock,
  releaseTemporaryLock,
};
