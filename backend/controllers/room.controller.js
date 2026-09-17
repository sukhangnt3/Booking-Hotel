// backend/controllers/room.controller.js
const crypto = require("crypto");
const pool = require("../config/database");
const { formatRoom } = require("../utils/formatters");

(async () => {
  try {
    await pool.query(`
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS hourly_tiers jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS half_day_price numeric;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS auto_surcharge boolean DEFAULT true;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS surcharge_type text DEFAULT 'tiered';
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS early_surcharge_tiers jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS late_surcharge_tiers jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.room_unit ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
    `);
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration room:", err.message);
  }
})();

// Helper chuẩn hóa format giá và các cấu hình bậc thang
const normalizeRoomPrices = (row) => {
  const formatted = formatRoom ? formatRoom(row) : {};
  const base = Number(row.base_price || 0);
  return {
    ...row,
    ...formatted,
    hourly_tiers: row.hourly_tiers || [],
    early_surcharge_tiers: row.early_surcharge_tiers || [],
    late_surcharge_tiers: row.late_surcharge_tiers || [],
    amount: Number(row.amount || 1),
    base_price: base,
    overnight_price: Number(row.overnight_price || base),
    half_day_price: Number(row.half_day_price || Math.round(base * 0.8)),
    hourly_price: Number(row.hourly_price || Math.round(base * 0.25)),
  };
};

const ROOM_QUERY_FIELDS = `
  SELECT r.id, r.hotel_id, h.name AS hotel_name, r.name, r.capacity, r.code, r.base_price, r.description, r.type, r.bed_type, r.room_area, r.is_active,
    COALESCE(r.hourly_tiers, '[]'::jsonb) AS hourly_tiers,
    COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
    COALESCE(NULLIF(r.half_day_price, 0), ROUND(r.base_price * 0.8)) AS half_day_price,
    COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
    COALESCE(r.early_checkin_fee, 0) AS early_checkin_fee,
    COALESCE(r.late_checkout_fee, 0) AS late_checkout_fee,
    COALESCE(r.auto_surcharge, true) AS auto_surcharge,
    COALESCE(r.surcharge_type, 'tiered') AS surcharge_type,
    COALESCE(r.early_surcharge_tiers, '[]'::jsonb) AS early_surcharge_tiers,
    COALESCE(r.late_surcharge_tiers, '[]'::jsonb) AS late_surcharge_tiers,
    COALESCE(NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0), r.amount, 1) AS amount,
    COALESCE((SELECT img.path FROM public.image img WHERE img.room_id = r.id ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), '') AS thumbnail,
    COALESCE((SELECT json_agg(img.path ORDER BY img.is_thumbnail DESC, img.display_order ASC) FROM public.image img WHERE img.room_id = r.id), '[]'::json) AS images,
    COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
  FROM public.room r
  JOIN public.hotel h ON h.id = r.hotel_id
  LEFT JOIN public.room_amenity ra ON ra.room_id = r.id
  LEFT JOIN public.amenity a ON a.id = ra.amenity_id
`;

// Helper batch sync ảnh & tiện nghi
async function syncRoomImagesAndAmenities(
  client,
  roomId,
  images = [],
  amenities = [],
) {
  const imgList = Array.isArray(images) ? images : images ? [images] : [];
  if (imgList.length) {
    const values = imgList
      .map(
        (url, i) =>
          `(gen_random_uuid(), NULL, '${roomId}', '${url.replace(/'/g, "''")}', ${i === 0}, ${i}, NOW())`,
      )
      .join(",");
    await client.query(
      `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at) VALUES ${values}`,
    );
  }

  if (Array.isArray(amenities) && amenities.length) {
    for (const name of amenities) {
      const clean = String(name || "").trim();
      if (!clean) continue;
      const res = await client
        .query(
          `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
          [clean],
        )
        .catch(() =>
          client.query(
            `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
            [clean],
          ),
        );

      const amenId = res.rows[0]?.id;
      if (amenId)
        await client.query(
          `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [roomId, amenId],
        );
    }
  }
}

// ─── 1. DANH SÁCH HẠNG PHÒNG ───
async function listRooms(req, res, next) {
  try {
    const hotelId = req.query.hotel_id || req.params.hotelId || req.params.id;
    if (!hotelId)
      return res.status(400).json({ message: "hotel_id là bắt buộc." });

    const result = await pool.query(
      `${ROOM_QUERY_FIELDS} WHERE r.hotel_id::text = $1 AND r.is_active = true GROUP BY r.id, h.name ORDER BY r.base_price ASC, r.created_at DESC`,
      [hotelId],
    );

    const formattedRooms = result.rows.map(normalizeRoomPrices);
    return res.json({
      success: true,
      data: formattedRooms,
      rooms: formattedRooms,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 2. CHI TIẾT PHÒNG THEO ID ───
async function getRoomById(req, res, next) {
  try {
    const result = await pool.query(
      `${ROOM_QUERY_FIELDS} WHERE r.id::text = $1 GROUP BY r.id, h.name`,
      [req.params.id],
    );
    if (!result.rows.length)
      return res.status(404).json({ message: "Không tìm thấy phòng." });

    const finalRoom = normalizeRoomPrices(result.rows[0]);
    return res.json({ success: true, data: finalRoom, room: finalRoom });
  } catch (error) {
    return next(error);
  }
}

// ─── 3. TẠO HẠNG PHÒNG MỚI ───
async function createRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const b = req.body;
    if (!b.hotel_id || !b.name || !b.base_price) {
      return res
        .status(400)
        .json({
          message: "hotel_id, tên phòng và giá phòng (base_price) là bắt buộc.",
        });
    }

    await client.query("BEGIN");

    let finalCode = (b.code || "").trim();
    if (!finalCode) {
      const countRes = await client.query(
        `SELECT COUNT(*)::int AS total FROM public.room WHERE hotel_id = $1`,
        [b.hotel_id],
      );
      finalCode = `P${String((countRes.rows[0]?.total || 0) + 1).padStart(3, "0")}`;
    }

    const newRoomId = crypto.randomUUID();
    const basePrice = Number(b.base_price);
    const finalAmount =
      Array.isArray(b.room_units) && b.room_units.length
        ? b.room_units.length
        : Number(b.amount || 1);

    const result = await client.query(
      `INSERT INTO public.room (
         id, hotel_id, code, name, capacity, base_price, overnight_price, half_day_price, hourly_price, hourly_tiers,
         auto_surcharge, surcharge_type, early_checkin_fee, late_checkout_fee, early_surcharge_tiers, late_surcharge_tiers,
         amount, type, bed_type, room_area, description, is_active, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15::jsonb, $16::jsonb, $17, $18, $19, $20, $21, true, NOW(), NOW()
       ) RETURNING *`,
      [
        newRoomId,
        b.hotel_id,
        finalCode,
        b.name.trim(),
        Number(b.capacity || 2),
        basePrice,
        Number(b.overnight_price) > 0 ? Number(b.overnight_price) : basePrice,
        Number(b.half_day_price) > 0
          ? Number(b.half_day_price)
          : Math.round(basePrice * 0.8),
        Number(b.hourly_price) > 0
          ? Number(b.hourly_price)
          : Math.round(basePrice * 0.25),
        JSON.stringify(b.hourly_tiers || []),
        Boolean(b.auto_surcharge !== false),
        b.surcharge_type || "tiered",
        Number(b.early_checkin_fee || 0),
        Number(b.late_checkout_fee || 0),
        JSON.stringify(b.early_surcharge_tiers || []),
        JSON.stringify(b.late_surcharge_tiers || []),
        finalAmount,
        b.type || "Tiêu chuẩn",
        b.bed_type || "1 Giường đôi King",
        Number(b.room_area || 25),
        b.description || null,
      ],
    );

    const newRoom = result.rows[0];

    // Đồng bộ sang toàn bộ phòng khác nếu chọn
    if (b.apply_to_all_rooms) {
      await client.query(
        `UPDATE public.room SET auto_surcharge = $1, surcharge_type = $2, early_checkin_fee = $3, late_checkout_fee = $4,
           early_surcharge_tiers = $5::jsonb, late_surcharge_tiers = $6::jsonb, updated_at = NOW()
         WHERE hotel_id = $7 AND id <> $8`,
        [
          Boolean(b.auto_surcharge !== false),
          b.surcharge_type || "tiered",
          Number(b.early_checkin_fee || 0),
          Number(b.late_checkout_fee || 0),
          JSON.stringify(b.early_surcharge_tiers || []),
          JSON.stringify(b.late_surcharge_tiers || []),
          b.hotel_id,
          newRoomId,
        ],
      );
    }

    // Tạo room_units
    if (Array.isArray(b.room_units) && b.room_units.length) {
      for (const u of b.room_units) {
        if (u.name?.trim()) {
          await client.query(
            `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, area, status, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'available', NOW(), NOW()) ON CONFLICT DO NOTHING`,
            [b.hotel_id, newRoomId, u.name.trim(), u.area || "Tầng 8"],
          );
        }
      }
    } else {
      const unitNumbers = Array.from(
        { length: finalAmount },
        (_, i) => `${newRoom.code}${i < 9 ? "0" + (i + 1) : i + 1}`,
      );
      await client.query(
        `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, area, status, created_at, updated_at)
         SELECT gen_random_uuid(), $1, $2, num, 'Tầng 8', 'available', NOW(), NOW() FROM unnest($3::text[]) AS num ON CONFLICT DO NOTHING`,
        [b.hotel_id, newRoomId, unitNumbers],
      );
    }

    // Sync ảnh & tiện nghi
    await syncRoomImagesAndAmenities(
      client,
      newRoomId,
      b.images || b.image,
      b.amenities,
    );

    await client.query("COMMIT");
    return res
      .status(201)
      .json({
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
    const b = req.body;
    await client.query("BEGIN");

    const currentRes = await client.query(
      `SELECT * FROM public.room WHERE id::text = $1`,
      [id],
    );
    if (!currentRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Không tìm thấy phòng." });
    }
    const curr = currentRes.rows[0];

    const basePrice =
      b.base_price !== undefined
        ? Number(b.base_price)
        : Number(curr.base_price || 0);
    const autoSur =
      b.auto_surcharge !== undefined
        ? Boolean(b.auto_surcharge)
        : Boolean(curr.auto_surcharge);
    const earlyFee = autoSur
      ? Number(b.early_checkin_fee ?? curr.early_checkin_fee ?? 0)
      : 0;
    const lateFee = autoSur
      ? Number(b.late_checkout_fee ?? curr.late_checkout_fee ?? 0)
      : 0;

    const result = await client.query(
      `UPDATE public.room SET
         code = COALESCE($1, code), name = COALESCE($2, name), capacity = COALESCE($3, capacity),
         base_price = $4,
         overnight_price = $5,
         half_day_price = $6,
         hourly_price = $7,
         auto_surcharge = $8, surcharge_type = COALESCE($9, surcharge_type),
         early_checkin_fee = $10, late_checkout_fee = $11,
         early_surcharge_tiers = COALESCE($12::jsonb, early_surcharge_tiers),
         late_surcharge_tiers = COALESCE($13::jsonb, late_surcharge_tiers),
         amount = $14, type = COALESCE($15, type), bed_type = COALESCE($16, bed_type),
         room_area = COALESCE($17, room_area), description = COALESCE($18, description),
         hourly_tiers = COALESCE($19::jsonb, hourly_tiers), updated_at = NOW()
       WHERE id::text = $20 RETURNING *`,
      [
        b.code?.trim() || null,
        b.name,
        b.capacity ? Number(b.capacity) : null,
        basePrice,
        b.overnight_price !== undefined
          ? Number(b.overnight_price)
          : Number(curr.overnight_price || basePrice),
        b.half_day_price !== undefined
          ? Number(b.half_day_price)
          : Number(curr.half_day_price || Math.round(basePrice * 0.8)),
        b.hourly_price !== undefined
          ? Number(b.hourly_price)
          : Number(curr.hourly_price || Math.round(basePrice * 0.25)),
        autoSur,
        b.surcharge_type || "tiered",
        earlyFee,
        lateFee,
        b.early_surcharge_tiers
          ? JSON.stringify(b.early_surcharge_tiers)
          : null,
        b.late_surcharge_tiers ? JSON.stringify(b.late_surcharge_tiers) : null,
        Array.isArray(b.room_units)
          ? b.room_units.length
          : Number(b.amount || curr.amount || 1),
        b.type,
        b.bed_type,
        b.room_area ? Number(b.room_area) : null,
        b.description,
        b.hourly_tiers ? JSON.stringify(b.hourly_tiers) : null,
        id,
      ],
    );

    if (b.apply_to_all_rooms) {
      await client.query(
        `UPDATE public.room SET auto_surcharge = $1, surcharge_type = $2, early_checkin_fee = $3, late_checkout_fee = $4,
           early_surcharge_tiers = COALESCE($5::jsonb, early_surcharge_tiers), late_surcharge_tiers = COALESCE($6::jsonb, late_surcharge_tiers), updated_at = NOW()
         WHERE hotel_id = $7 AND id <> $8`,
        [
          autoSur,
          b.surcharge_type || "tiered",
          earlyFee,
          lateFee,
          b.early_surcharge_tiers
            ? JSON.stringify(b.early_surcharge_tiers)
            : null,
          b.late_surcharge_tiers
            ? JSON.stringify(b.late_surcharge_tiers)
            : null,
          curr.hotel_id,
          id,
        ],
      );
    }

    // Sync room_units
    if (Array.isArray(b.room_units)) {
      const activeNames = b.room_units
        .map((u) => u.name?.trim())
        .filter(Boolean);
      if (activeNames.length) {
        await client
          .query(
            `DELETE FROM public.room_unit WHERE room_id = $1 AND room_number != ALL($2::text[]) AND status NOT IN ('occupied')`,
            [id, activeNames],
          )
          .catch(() => {});
      }
      for (const u of b.room_units) {
        if (!u.name?.trim()) continue;
        await client.query(
          `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, area, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'available', NOW(), NOW())
           ON CONFLICT (hotel_id, room_number) DO UPDATE SET area = EXCLUDED.area, updated_at = NOW()`,
          [curr.hotel_id, id, u.name.trim(), u.area || "Tầng 8"],
        );
      }
    }

    // Sync ảnh & amenities
    const imgs =
      Array.isArray(b.images) && b.images.length
        ? b.images
        : b.image
          ? [b.image]
          : [];
    if (imgs.length) {
      await client
        .query(`DELETE FROM public.image WHERE room_id::text = $1`, [id])
        .catch(() => {});
      await syncRoomImagesAndAmenities(client, id, imgs, []);
    }
    if (Array.isArray(b.amenities)) {
      await client
        .query(`DELETE FROM public.room_amenity WHERE room_id::text = $1`, [id])
        .catch(() => {});
      await syncRoomImagesAndAmenities(client, id, [], b.amenities);
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Cập nhật giá và cấu hình phụ thu bậc thang thành công!",
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

// ─── 5. XÓA HOẶC SOFT-DELETE HẠNG PHÒNG ───
async function deleteRoom(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const checkBooking = await client.query(
      `SELECT id FROM public.booking_room WHERE room_id::text = $1 LIMIT 1`,
      [id],
    );

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

    await client.query("BEGIN");
    await Promise.all([
      client
        .query(`DELETE FROM public.temporary_locks WHERE room_id::text = $1`, [
          id,
        ])
        .catch(() => {}),
      client
        .query(`DELETE FROM public.room_inventory WHERE room_id::text = $1`, [
          id,
        ])
        .catch(() => {}),
      client
        .query(`DELETE FROM public.room_amenity WHERE room_id::text = $1`, [id])
        .catch(() => {}),
      client
        .query(`DELETE FROM public.image WHERE room_id::text = $1`, [id])
        .catch(() => {}),
      client
        .query(`DELETE FROM public.room_unit WHERE room_id::text = $1`, [id])
        .catch(() => {}),
    ]);

    const delRes = await client.query(
      `DELETE FROM public.room WHERE id::text = $1 RETURNING id`,
      [id],
    );
    await client.query("COMMIT");

    if (!delRes.rowCount)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phòng để xóa." });
    return res.json({
      success: true,
      message: "Đã xóa hạng phòng thành công.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 6. TIỆN NGHI ───
async function listRoomAmenities(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.name, a.type FROM public.room_amenity ra JOIN public.amenity a ON a.id = ra.amenity_id WHERE ra.room_id::text = $1 ORDER BY a.name ASC`,
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

// ─── 7. TỒN KHO & GIÁ ───
async function getRoomInventory(req, res) {
  const { month, year } = req.query;
  try {
    let where = `WHERE room_id::text = $1`,
      params = [req.params.id];
    if (month && year) {
      params.push(`${year}-${String(month).padStart(2, "0")}-01`);
      where += ` AND inventory_date >= $2::date AND inventory_date <= ($2::date + INTERVAL '1 month' - INTERVAL '1 day')`;
    }
    const result = await pool.query(
      `SELECT * FROM public.room_inventory ${where} ORDER BY inventory_date ASC`,
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

async function updateRoomInventory(req, res) {
  const roomId = req.params.id;
  const b = req.body;
  const inventoryDate = b.inventoryDate || b.date;
  if (!inventoryDate)
    return res.status(400).json({ message: "inventoryDate là bắt buộc." });

  const avail = Number(b.availableCount ?? b.available_count ?? 0);
  const sellPrice = Number(b.sellPrice ?? b.sell_price ?? 500000);
  const basePrice = Number(b.basePrice ?? b.base_price ?? sellPrice);
  const status = b.status || "active";

  try {
    const result = await pool.query(
      `INSERT INTO public.room_inventory (id, room_id, inventory_date, available_count, sold_count, locked_count, base_price, sell_price, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2::date, $3, 0, 0, $4, $5, $6::public.room_inventory_status_enum, NOW(), NOW())
       ON CONFLICT (room_id, inventory_date)
       DO UPDATE SET available_count = EXCLUDED.available_count, base_price = EXCLUDED.base_price, sell_price = EXCLUDED.sell_price, status = EXCLUDED.status, updated_at = NOW()
       RETURNING *`,
      [roomId, inventoryDate, avail, basePrice, sellPrice, status],
    );
    return res.json({
      success: true,
      message: "Đã cập nhật tồn kho & giá thành công!",
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 8. KHÓA GIỮ PHÒNG TẠM THỜI ───
async function createTemporaryLock(req, res) {
  const { roomId, checkIn, checkOut, quantity = 1 } = req.body;
  if (!roomId || !checkIn || !checkOut)
    return res.status(400).json({ message: "Thiếu thông tin giữ phòng." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const checkQuery = `
      WITH StayNights AS (SELECT generate_series($2::date, ($3::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date)
      SELECT sn.night_date,
        GREATEST(0, COALESCE(ri.available_count, r.amount)
          - COALESCE((SELECT SUM(br.quantity)::int FROM public.booking_room br JOIN public.booking b ON b.id = br.booking_id WHERE br.room_id = r.id AND br.book_date = sn.night_date AND b.status IN ('confirmed', 'checked_in', 'pending')), 0)
          - COALESCE((SELECT SUM(tl.quantity)::int FROM public.temporary_locks tl WHERE tl.room_id = r.id AND tl.lock_date = sn.night_date AND tl.expires_at > NOW()), 0)
        ) AS current_available
      FROM public.room r CROSS JOIN StayNights sn
      LEFT JOIN public.room_inventory ri ON ri.room_id = r.id AND ri.inventory_date = sn.night_date
      WHERE r.id::text = $1;
    `;
    const checkRes = await client.query(checkQuery, [
      roomId,
      checkIn,
      checkOut,
    ]);
    if (
      !checkRes.rows.every(
        (r) => Number(r.current_available) >= Number(quantity),
      )
    ) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({
          success: false,
          message: "Phòng vừa có người khác giữ chỗ trước.",
        });
    }

    const lockSessionId = crypto.randomUUID();
    await client.query(
      `INSERT INTO public.temporary_locks (id, room_id, user_id, session_id, lock_date, quantity, lock_expires_at, expires_at, created_at)
       SELECT gen_random_uuid(), $1, $2, $3, sn.night_date, $4, NOW() + INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes', NOW()
       FROM (SELECT generate_series($5::date, ($6::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date) sn`,
      [
        roomId,
        req.user?.id || null,
        lockSessionId,
        quantity,
        checkIn,
        checkOut,
      ],
    );

    await client.query("COMMIT");
    return res
      .status(201)
      .json({
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

async function releaseTemporaryLock(req, res) {
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

// ─── 9. PHÒNG VẬT LÝ (ROOM_UNIT) ───
async function listRoomUnits(req, res) {
  try {
    const { hotel_id } = req.query;
    if (!hotel_id) return res.json({ success: true, units: [] });

    const result = await pool.query(
      `SELECT ru.id, ru.room_id, ru.hotel_id, h.name AS hotel_name, ru.room_number AS name,
              COALESCE(ru.area, 'Tầng 8') AS area, COALESCE(ru.images, '[]'::jsonb) AS images,
              r.name AS room_type_name, r.code AS room_type_code, r.base_price AS daily_price,
              COALESCE(NULLIF(r.overnight_price, 0), r.base_price) AS overnight_price,
              COALESCE(NULLIF(r.half_day_price, 0), ROUND(r.base_price * 0.8)) AS half_day_price,
              COALESCE(NULLIF(r.hourly_price, 0), ROUND(r.base_price * 0.25)) AS hourly_price,
              COALESCE(r.early_checkin_fee, 0) AS early_checkin_fee, COALESCE(r.late_checkout_fee, 0) AS late_checkout_fee, ru.status
       FROM public.room_unit ru JOIN public.room r ON r.id = ru.room_id JOIN public.hotel h ON h.id = ru.hotel_id
       WHERE ru.hotel_id::text = $1 ORDER BY ru.area ASC, ru.room_number ASC`,
      [hotel_id],
    );
    return res.json({ success: true, units: result.rows || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function upsertRoomUnit(req, res) {
  const client = await pool.connect();
  try {
    const { id, room_id, hotel_id, name, area, images = [] } = req.body;
    if (!room_id || !name)
      return res
        .status(400)
        .json({ message: "Thiếu thông tin phòng hoặc hạng phòng." });

    await client.query("BEGIN");
    const targetHotelId =
      hotel_id ||
      (
        await client.query(
          `SELECT hotel_id FROM public.room WHERE id::text = $1`,
          [room_id],
        )
      ).rows[0]?.hotel_id;

    let savedUnit;
    if (id && !String(id).includes("_unit_")) {
      const up = await client.query(
        `UPDATE public.room_unit SET room_number = $1, area = $2, room_id = $3, images = $4::jsonb, updated_at = NOW() WHERE id = $5 RETURNING *`,
        [name.trim(), area || "Tầng 8", room_id, JSON.stringify(images), id],
      );
      savedUnit = up.rows[0];
    } else {
      const up = await client.query(
        `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, area, status, images, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, 'available', $5::jsonb, NOW(), NOW())
         ON CONFLICT (hotel_id, room_number) DO UPDATE SET area = EXCLUDED.area, room_id = EXCLUDED.room_id, images = EXCLUDED.images, updated_at = NOW()
         RETURNING *`,
        [
          targetHotelId,
          room_id,
          name.trim(),
          area || "Tầng 8",
          JSON.stringify(images),
        ],
      );
      savedUnit = up.rows[0];
    }

    await client.query(
      `UPDATE public.room SET amount = (SELECT COUNT(id) FROM public.room_unit WHERE room_id = $1), updated_at = NOW() WHERE id = $1`,
      [room_id],
    );
    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Đã lưu phòng ${name} thành công!`,
      unit: savedUnit,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function deleteRoomUnit(req, res) {
  try {
    const { id } = req.params;
    const findRes = await pool.query(
      `DELETE FROM public.room_unit WHERE id::text = $1 RETURNING room_id`,
      [id],
    );
    const roomId = findRes.rows[0]?.room_id;

    if (roomId) {
      await pool.query(
        `UPDATE public.room SET amount = GREATEST(1, (SELECT COUNT(id) FROM public.room_unit WHERE room_id = $1)), updated_at = NOW() WHERE id = $1`,
        [roomId],
      );
    }
    return res.json({ success: true, message: "Đã xóa phòng khỏi Database!" });
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
  listRoomUnits,
  upsertRoomUnit,
  deleteRoomUnit,
};
