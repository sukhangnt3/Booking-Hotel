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
       WHERE r.hotel_id::text = $1
       GROUP BY r.id
       ORDER BY r.base_price ASC, r.created_at DESC`,
      [hotelId],
    );

    const formattedRooms = result.rows.map((row) =>
      formatRoom ? formatRoom(row) : row,
    );

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

    return res.json({
      success: true,
      data: formatRoom ? formatRoom(room) : room,
      room: formatRoom ? formatRoom(room) : room,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 3. TẠO HẠNG PHÒNG MỚI (TỰ SINH UUID) ───
async function createRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      hotel_id,
      name,
      capacity,
      base_price,
      amount,
      type,
      bed_type,
      room_area,
      description,
      image,
      amenities = [],
    } = req.body;

    if (!hotel_id || !name || !base_price || !amount) {
      return res.status(400).json({
        message:
          "hotel_id, tên phòng, giá phòng (base_price) và số lượng phòng (amount) là bắt buộc.",
      });
    }

    await client.query("BEGIN");

    const newRoomId = crypto.randomUUID();

    const result = await client.query(
      `INSERT INTO public.room (
         id, hotel_id, name, capacity, base_price, amount, type, bed_type, room_area, description, is_active, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW())
       RETURNING *`,
      [
        newRoomId,
        hotel_id,
        name.trim(),
        Number(capacity || 2),
        Number(base_price),
        Number(amount),
        type || "Deluxe",
        bed_type || "1 Giường đôi King",
        Number(room_area || 25),
        description || null,
      ],
    );

    const newRoom = result.rows[0];

    for (let i = 1; i <= Number(amount); i++) {
      await client
        .query(
          `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'available', NOW(), NOW())
         ON CONFLICT (hotel_id, room_number) DO NOTHING`,
          [hotel_id, newRoom.id, `P.${newRoom.name.substring(0, 3)}-${i}`],
        )
        .catch(() => {});
    }

    if (image) {
      await client.query(
        `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW())`,
        [hotel_id, newRoom.id, image],
      );
    }

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

// ─── 4. CẬP NHẬT HẠNG PHÒNG ───
async function updateRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      name,
      capacity,
      base_price,
      amount,
      type,
      bed_type,
      room_area,
      description,
      image,
      amenities,
    } = req.body;

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE public.room
       SET name = COALESCE($1, name),
           capacity = COALESCE($2, capacity),
           base_price = COALESCE($3, base_price),
           amount = COALESCE($4, amount),
           type = COALESCE($5, type),
           bed_type = COALESCE($6, bed_type),
           room_area = COALESCE($7, room_area),
           description = COALESCE($8, description),
           updated_at = NOW()
       WHERE id::text = $9
       RETURNING *`,
      [
        name,
        capacity ? Number(capacity) : null,
        base_price ? Number(base_price) : null,
        amount ? Number(amount) : null,
        type,
        bed_type,
        room_area ? Number(room_area) : null,
        description,
        id,
      ],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }

    if (image) {
      await client.query(
        `UPDATE public.image SET path = $1 WHERE room_id::text = $2 AND is_thumbnail = true`,
        [image, id],
      );
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
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 5. XÓA PHÒNG ───
async function deleteRoom(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM public.room_amenity WHERE room_id::text = $1`,
      [id],
    );
    await pool.query(`DELETE FROM public.image WHERE room_id::text = $1`, [id]);
    await pool.query(`DELETE FROM public.room_unit WHERE room_id::text = $1`, [
      id,
    ]);
    await pool.query(`DELETE FROM public.room WHERE id::text = $1`, [id]);
    return res.json({ success: true, message: "Đã xóa phòng thành công." });
  } catch (error) {
    return next(error);
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

// ─── 8. LẤY DỮ LIỆU TỒN KHO & GIÁ THEO THÁNG (BẢNG 7: ROOM_INVENTORY) ───
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
       FROM public.room_inventory
       ${whereClause}
       ORDER BY inventory_date ASC`,
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

// ─── 9. CẬP NHẬT TỒN KHO & GIÁ THEO NGÀY (BẢNG 7: ROOM_INVENTORY) ───
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
       SET available_count = $1,
           base_price = $2,
           sell_price = $3,
           status = $4::public.room_inventory_status_enum,
           updated_at = NOW()
       WHERE room_id::text = $5 AND inventory_date = $6::date
       RETURNING *`,
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
      message: "Đã cập nhật tồn kho & giá ngày thành công!",
      data: row,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
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
};
