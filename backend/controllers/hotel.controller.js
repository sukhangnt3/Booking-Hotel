// backend/controllers/hotel.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// ─── 1. DANH SÁCH KHÁCH SẠN CÔNG KHAI (CHỈ LẤY CƠ SỞ ACTIVE) ───
async function listHotels(req, res, next) {
  try {
    const destination = (
      req.query.destination ||
      req.query.city ||
      req.query.search ||
      ""
    ).trim();
    const params = [];
    let where = "WHERE h.status = 'active'::public.hotel_status_enum";

    if (destination) {
      params.push(`%${destination}%`);
      where += ` AND (h.name ILIKE $1 OR h.city ILIKE $1 OR h.address ILIKE $1)`;
    }

    const sql = `
      SELECT
         h.id,
         h.name,
         h.address,
         h.city,
         h.latitude,
         h.longitude,
         h.star_rating,
         h.average_rating,
         h.review_count,
         h.phone,
         h.email,
         h.status,
         h.description,
         h.checkin_time,
         h.checkout_time,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             WHERE img.hotel_id = h.id 
             ORDER BY img.is_thumbnail DESC, img.display_order ASC, img.created_at ASC 
             LIMIT 1
           ),
           'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
         ) AS image,
         COALESCE(
           (
             SELECT MIN(r.base_price) 
             FROM public.room r 
             WHERE r.hotel_id = h.id AND r.is_active = true
           ),
           500000
         ) AS min_price
       FROM public.hotel h
       ${where}
       ORDER BY h.created_at DESC
       LIMIT 100;
    `;

    const result = await pool.query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ LỖI LIST_HOTELS:", error);
    return next(error);
  }
}

// ─── 2. CHI TIẾT KHÁCH SẠN THEO ID ───
async function getHotelById(req, res, next) {
  try {
    const hotelId = String(req.params.id || "").trim();

    if (!hotelId) {
      return res.status(400).json({ message: "Thiếu ID khách sạn." });
    }

    const hotelRes = await pool.query(
      `SELECT * FROM public.hotel WHERE id::text = $1 LIMIT 1`,
      [hotelId],
    );

    if (hotelRes.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy khách sạn trong hệ thống." });
    }

    const hotelData = hotelRes.rows[0];

    const imagesRes = await pool
      .query(
        `SELECT id, path, is_thumbnail, display_order 
       FROM public.image 
       WHERE hotel_id = $1 
       ORDER BY is_thumbnail DESC, display_order ASC, created_at ASC`,
        [hotelData.id],
      )
      .catch(() => ({ rows: [] }));

    const roomsRes = await pool
      .query(
        `SELECT 
         r.*,
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1),
           'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
         ) AS image,
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1),
           'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
         ) AS thumbnail,
         COALESCE(
           (
             SELECT json_agg(a.name) 
             FROM public.room_amenity ra 
             JOIN public.amenity a ON a.id = ra.amenity_id 
             WHERE ra.room_id = r.id
           ), 
           '[]'::json
         ) AS amenities
       FROM public.room r
       WHERE r.hotel_id = $1 AND r.is_active = true
       ORDER BY r.base_price ASC`,
        [hotelData.id],
      )
      .catch(() => ({ rows: [] }));

    const amenitiesRes = await pool
      .query(
        `SELECT a.name, a.type 
       FROM public.amenity a
       JOIN public.hotel_amenity ha ON ha.amenity_id = a.id 
       WHERE ha.hotel_id = $1`,
        [hotelData.id],
      )
      .catch(() => ({ rows: [] }));

    hotelData.images = imagesRes.rows;
    hotelData.rooms = roomsRes.rows;
    hotelData.amenities = amenitiesRes.rows.map((row) => row.name);

    return res.json({
      success: true,
      data: hotelData,
      hotel: hotelData,
    });
  } catch (error) {
    console.error("❌ LỖI GET_HOTEL_BY_ID:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. KIỂM TRA PHÒNG TRỐNG THỜI GIAN THỰC (REALTIME AVAILABILITY) ───
async function listHotelRoomAvailability(req, res, next) {
  const hotelId = req.params.id;
  const checkIn =
    req.query.checkIn ||
    req.query.checkin_date ||
    new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkOut =
    req.query.checkOut ||
    req.query.checkout_date ||
    tomorrow.toISOString().split("T")[0];

  try {
    const query = `
      SELECT 
        r.id,
        r.hotel_id,
        r.name,
        r.capacity,
        r.base_price,
        r.amount AS total_rooms,
        r.bed_type,
        r.room_area,
        r.type,
        r.description,
        COALESCE(
          r.amount - COALESCE((
            SELECT SUM(br.quantity)::int 
            FROM public.booking_room br
            JOIN public.booking b ON b.id = br.booking_id
            WHERE br.room_id = r.id 
              AND b.status IN ('confirmed', 'checked_in', 'pending')
              AND (b.checkin_date < $3::date AND b.checkout_date > $2::date)
          ), 0),
          r.amount
        )::int AS remaining_rooms,
        COALESCE(
          (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1),
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800'
        ) AS thumbnail,
        COALESCE(
          (
            SELECT json_agg(a.name) 
            FROM public.room_amenity ra 
            JOIN public.amenity a ON a.id = ra.amenity_id 
            WHERE ra.room_id = r.id
          ), 
          '[]'::json
        ) AS amenities
      FROM public.room r
      WHERE r.hotel_id::text = $1 AND r.is_active = true
      ORDER BY r.base_price ASC;
    `;

    const result = await pool.query(query, [hotelId, checkIn, checkOut]);

    return res.json({
      success: true,
      data: result.rows,
      rooms: result.rows,
      checkIn,
      checkOut,
    });
  } catch (error) {
    console.error("❌ LỖI AVAILABILITY:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. GỢI Ý ĐIỂM ĐẾN & TÊN KHÁCH SẠN TỰ ĐỘNG KHI TÌM KIẾM ───
async function listDestinationSuggestions(req, res, next) {
  const keyword = (req.query.q || req.query.keyword || "").trim();

  try {
    let query = "";
    let params = [];

    if (keyword) {
      params.push(`%${keyword}%`);
      query = `
        SELECT DISTINCT city AS name, COUNT(*)::int AS hotel_count, 'city' AS type
        FROM public.hotel
        WHERE status = 'active' AND (city ILIKE $1 OR name ILIKE $1)
        GROUP BY city
        UNION
        SELECT name, 1 AS hotel_count, 'hotel' AS type
        FROM public.hotel
        WHERE status = 'active' AND name ILIKE $1
        LIMIT 8;
      `;
    } else {
      query = `
        SELECT DISTINCT city AS name, COUNT(*)::int AS hotel_count, 'city' AS type
        FROM public.hotel
        WHERE status = 'active'
        GROUP BY city
        ORDER BY hotel_count DESC
        LIMIT 6;
      `;
    }

    const result = await pool.query(query, params);
    return res.json({
      success: true,
      data: result.rows,
      destinations: result.rows,
    });
  } catch (error) {
    console.error("❌ LỖI DESTINATION_SUGGESTIONS:", error);
    return res.json({ success: true, data: [], destinations: [] });
  }
}

// ─── 5. ĐĂNG KÝ CƠ SỞ ĐỐI TÁC ───
async function registerHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const ownerId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!ownerId) {
      return res.status(401).json({
        message: "Vui lòng đăng nhập tài khoản để thực hiện đăng ký đối tác.",
      });
    }

    const {
      name,
      address,
      city,
      latitude,
      longitude,
      phone,
      email,
      star_rating,
      description,
      checkin_time,
      checkout_time,
      bank_name,
      bank_account,
      bank_account_holder,
      tax_code,
      business_license_url,
      rooms = [],
      image,
      amenities = [],
    } = req.body;

    if (!name || !address || !city) {
      return res
        .status(400)
        .json({ message: "Tên khách sạn, địa chỉ và thành phố là bắt buộc." });
    }

    await client.query("BEGIN");

    const newHotelId = crypto.randomUUID();

    const hotelInsertSql = `
      INSERT INTO public.hotel (
        id, owner_id, name, address, city, latitude, longitude,
        phone, email, star_rating, description,
        checkin_time, checkout_time,
        bank_name, bank_account, bank_account_holder, tax_code, business_license_url,
        status, commission_rate, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, COALESCE($10, 3), $11,
        COALESCE($12::time, '14:00:00'::time), COALESCE($13::time, '12:00:00'::time),
        $14, $15, $16, $17, $18,
        'pending'::public.hotel_status_enum, 18.00, NOW(), NOW()
      )
      RETURNING *;
    `;

    const hotelResult = await client.query(hotelInsertSql, [
      newHotelId,
      ownerId,
      name.trim(),
      address.trim(),
      city.trim(),
      latitude ? Number(latitude) : 10.7769,
      longitude ? Number(longitude) : 106.7009,
      phone || null,
      email || null,
      star_rating ? Number(star_rating) : 3,
      description || null,
      checkin_time || "14:00:00",
      checkout_time || "12:00:00",
      bank_name || null,
      bank_account || null,
      bank_account_holder || null,
      tax_code || null,
      business_license_url || null,
    ]);

    const newHotel = hotelResult.rows[0];

    if (image) {
      await client.query(
        `INSERT INTO public.image (id, hotel_id, path, is_thumbnail, display_order, created_at)
         VALUES (gen_random_uuid(), $1, $2, true, 0, NOW())`,
        [newHotel.id, image],
      );
    }

    if (Array.isArray(rooms) && rooms.length > 0) {
      let roomFloor = 1;
      for (const r of rooms) {
        const totalAmount = Number(r.totalRooms || r.amount || 4);
        const newRoomId = crypto.randomUUID();

        await client.query(
          `INSERT INTO public.room (
             id, hotel_id, name, capacity, base_price, amount, type, bed_type, room_area, is_active, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
          [
            newRoomId,
            newHotel.id,
            r.roomName || r.name || "Phòng Tiêu Chuẩn",
            Number(r.maxAdults || r.capacity || 2),
            Number(r.weekdayPrice || r.base_price || r.sell_price || 500000),
            totalAmount,
            r.type || "Deluxe",
            r.bedType || r.bed_type || "1 Giường đôi lớn (King Size)",
            Number(r.roomSize || r.room_area || 28),
          ],
        );

        const roomNumbers =
          Array.isArray(r.room_numbers) && r.room_numbers.length > 0
            ? r.room_numbers
            : Array.from(
                { length: totalAmount },
                (_, i) => `P.${roomFloor}0${i + 1}`,
              );

        for (const num of roomNumbers) {
          if (!num || !String(num).trim()) continue;
          await client
            .query(
              `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, status, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'available', NOW(), NOW())
             ON CONFLICT (hotel_id, room_number) DO NOTHING`,
              [newHotel.id, newRoomId, String(num).trim()],
            )
            .catch(() => {});
        }
        roomFloor++;

        if (Array.isArray(r.amenities)) {
          for (const amName of r.amenities) {
            if (!amName || !String(amName).trim()) continue;
            let amRes = await client.query(
              `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
              [amName.trim()],
            );
            let amId = amRes.rows[0]?.id;
            if (!amId) {
              const newAm = await client.query(
                `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`,
                [amName.trim()],
              );
              amId = newAm.rows[0]?.id;
            }
            if (amId) {
              await client.query(
                `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [newRoomId, amId],
              );
            }
          }
        }
      }
    }

    if (Array.isArray(amenities) && amenities.length > 0) {
      for (const amName of amenities) {
        if (!amName || !String(amName).trim()) continue;
        let amRes = await client.query(
          `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
          [amName.trim()],
        );
        let amId = amRes.rows[0]?.id;
        if (!amId) {
          const newAm = await client.query(
            `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`,
            [amName.trim()],
          );
          amId = newAm.rows[0]?.id;
        }
        if (amId) {
          await client.query(
            `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newHotel.id, amId],
          );
        }
      }
    }

    const roleCheck = await client.query(
      `SELECT id FROM public.roles WHERE UPPER(name) = 'HOTEL_OWNER'`,
    );
    let ownerRoleId = roleCheck.rows[0]?.id;
    if (!ownerRoleId) {
      const insRole = await client.query(
        `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), 'HOTEL_OWNER') RETURNING id`,
      );
      ownerRoleId = insRole.rows[0]?.id;
    }

    await client.query(
      `INSERT INTO public.user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [ownerId, ownerRoleId],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Hồ sơ đăng ký đã được gửi thành công và đang chờ Admin duyệt.",
      hotel: newHotel,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI REGISTER_HOTEL:", error);
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 6. LẤY DANH SÁCH KHÁCH SẠN CỦA OWNER ───
async function getMyHotels(req, res, next) {
  try {
    const ownerId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!ownerId) {
      return res
        .status(401)
        .json({ message: "Chưa xác thực danh tính đối tác." });
    }

    const activeOnly = req.query.active_only === "true";

    let sql = `
      SELECT 
         h.*,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             WHERE img.hotel_id = h.id 
             ORDER BY img.is_thumbnail DESC, img.created_at ASC 
             LIMIT 1
           ),
           'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600'
         ) AS image,
         (
           SELECT COUNT(*)::int 
           FROM public.room r 
           WHERE r.hotel_id = h.id
         ) AS room_count
       FROM public.hotel h
       WHERE h.owner_id = $1
    `;

    const params = [ownerId];

    if (activeOnly) {
      sql += ` AND h.status = 'active'::public.hotel_status_enum`;
    }

    sql += ` ORDER BY h.created_at DESC`;

    const result = await pool.query(sql, params);

    return res.json({
      success: true,
      data: result.rows,
      hotels: result.rows,
    });
  } catch (error) {
    console.error("❌ LỖI GET_MY_HOTELS:", error);
    return next(error);
  }
}

// ─── 7. DANH SÁCH ĐIỂM ĐẾN THỊNH HÀNH ───
async function listTrendingDestinations(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         h.city AS title,
         h.city AS name,
         COUNT(*)::int AS hotelCount,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             JOIN public.hotel h2 ON h2.id = img.hotel_id 
             WHERE h2.city = h.city 
             LIMIT 1
           ),
           'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800'
         ) AS image
       FROM public.hotel h
       WHERE h.status = 'active'::public.hotel_status_enum AND h.city IS NOT NULL
       GROUP BY h.city
       ORDER BY hotelCount DESC
       LIMIT 8`,
    );
    return res.json({
      success: true,
      data: result.rows,
      trendingDestinations: result.rows,
    });
  } catch (error) {
    return next(error);
  }
}

async function searchHotels(req, res, next) {
  return listHotels(req, res, next);
}

async function listHotelRooms(req, res, next) {
  try {
    const r = await pool.query(
      `SELECT 
         r.*,
         (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1) AS thumbnail,
         COALESCE(
           (
             SELECT json_agg(a.name) 
             FROM public.room_amenity ra 
             JOIN public.amenity a ON a.id = ra.amenity_id 
             WHERE ra.room_id = r.id
           ), 
           '[]'::json
         ) AS amenities
       FROM public.room r 
       WHERE r.hotel_id::text = $1 AND r.is_active = true
       ORDER BY r.base_price ASC`,
      [req.params.id],
    );
    return res.json({ success: true, data: r.rows, rooms: r.rows });
  } catch (e) {
    return next(e);
  }
}

async function listPropertyTypes(req, res) {
  return res.json({ success: true, data: [] });
}

async function listDiscoverVietnam(req, res) {
  return res.json({ success: true, data: [] });
}

async function listUniqueStays(req, res) {
  return res.json({ success: true, data: [] });
}

module.exports = {
  listHotels,
  registerHotel,
  getMyHotels,
  getHotelById,
  listTrendingDestinations,
  searchHotels,
  listHotelRooms,
  listPropertyTypes,
  listDiscoverVietnam,
  listUniqueStays,
  listDestinationSuggestions,
  listHotelRoomAvailability,
};
