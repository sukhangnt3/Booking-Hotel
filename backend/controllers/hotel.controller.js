// backend/controllers/hotel.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

const PUBLIC_HOTEL_STATUS = "h.status::text IN ('active', 'approved')";

function parseSearchDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

// ─── 1. DANH SÁCH KHÁCH SẠN CÔNG KHAI (CHỈ LẤY CƠ SỞ ACTIVE) ───
async function listHotels(req, res, next) {
  try {
    const destination = (
      req.query.destination ||
      req.query.city ||
      req.query.search ||
      ""
    ).trim();
    const checkIn = parseSearchDate(
      req.query.checkIn || req.query.checkin_date,
    );
    const checkOut = parseSearchDate(
      req.query.checkOut || req.query.checkout_date,
    );
    if (
      (req.query.checkIn ||
        req.query.checkin_date ||
        req.query.checkOut ||
        req.query.checkout_date) &&
      (!checkIn || !checkOut || checkOut <= checkIn)
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày nhận phòng và trả phòng không hợp lệ.",
      });
    }

    const adults = Math.max(1, Number(req.query.adults || 1));
    const rooms = Math.max(1, Number(req.query.rooms || 1));
    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const stars = String(req.query.stars || "")
      .split(",")
      .map(Number)
      .filter((star) => Number.isFinite(star) && star > 0);
    const params = [];
    const normalizedDestination = destination
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .trim();

    // Tự động nhận diện Khánh Hòa <-> Nha Trang
    let destinationVariants = [];
    if (
      normalizedDestination.includes("khanh hoa") ||
      normalizedDestination.includes("nha trang")
    ) {
      destinationVariants = ["%Khánh Hòa%", "%Nha Trang%", "%Khanh Hoa%"];
    } else if (destination) {
      destinationVariants = [`%${destination}%`];
    }

    let where = `WHERE ${PUBLIC_HOTEL_STATUS}`;

    if (destinationVariants.length > 0) {
      params.push(...destinationVariants);
      const destinationConditions = destinationVariants
        .map(
          (_, index) =>
            `(h.name ILIKE $${index + 1} 
              OR h.city ILIKE $${index + 1} 
              OR h.address ILIKE $${index + 1}
              OR unaccent(lower(h.name)) ILIKE unaccent(lower($${index + 1}))
              OR unaccent(lower(h.city)) ILIKE unaccent(lower($${index + 1}))
              OR unaccent(lower(h.address)) ILIKE unaccent(lower($${index + 1})))`,
        )
        .join(" OR ");
      where += ` AND (${destinationConditions})`;
    }
    if (stars.length > 0) {
      params.push(stars);
      where += ` AND h.star_rating = ANY($${params.length}::int[])`;
    }

    if (minPrice > 0) {
      params.push(minPrice);
      where += ` AND EXISTS (
          SELECT 1 FROM public.room rp
          WHERE rp.hotel_id = h.id AND rp.is_active = true AND rp.base_price >= $${params.length}
        )`;
    }

    if (maxPrice > 0) {
      params.push(maxPrice);
      where += ` AND EXISTS (
          SELECT 1 FROM public.room rp
          WHERE rp.hotel_id = h.id AND rp.is_active = true AND rp.base_price <= $${params.length}
        )`;
    }

    if (checkIn && checkOut) {
      params.push(checkIn, checkOut, adults, rooms);
      const checkInParam = params.length - 3;
      const checkOutParam = params.length - 2;
      const adultsParam = params.length - 1;
      const roomsParam = params.length;
      where += ` AND EXISTS (
          SELECT 1
          FROM public.room ar
          WHERE ar.hotel_id = h.id
            AND ar.is_active = true
            AND ar.capacity >= $${adultsParam}
            AND NOT EXISTS (
              SELECT 1
              FROM generate_series(
                $${checkInParam}::date,
                ($${checkOutParam}::date - INTERVAL '1 day')::date,
                INTERVAL '1 day'
              ) AS stay(night_date)
              LEFT JOIN public.room_inventory ri
                ON ri.room_id = ar.id AND ri.inventory_date = stay.night_date
              WHERE COALESCE(ri.status::text, 'active') <> 'active'
                OR GREATEST(0, COALESCE(ri.available_count, ar.amount)
                  - COALESCE((
                    SELECT SUM(br.quantity)::int
                    FROM public.booking_room br
                    JOIN public.booking b ON b.id = br.booking_id
                    WHERE br.room_id = ar.id
                      AND b.status::text IN ('confirmed', 'checked_in', 'pending')
                      AND b.checkin_date < $${checkOutParam}::date
                      AND b.checkout_date > $${checkInParam}::date
                  ), 0)
                  - COALESCE((
                    SELECT SUM(tl.quantity)::int
                    FROM public.temporary_locks tl
                    WHERE tl.room_id = ar.id
                      AND tl.lock_date = stay.night_date
                      AND tl.expires_at > NOW()
                  ), 0)) < $${roomsParam}
            )
        )`;
    }

    const sortBy = String(req.query.sortBy || "popular");
    const orderBy =
      sortBy === "price_low"
        ? "min_price ASC, h.average_rating DESC NULLS LAST"
        : sortBy === "price_high"
          ? "min_price DESC, h.average_rating DESC NULLS LAST"
          : sortBy === "rating"
            ? "h.average_rating DESC NULLS LAST, min_price ASC"
            : "h.average_rating DESC NULLS LAST, h.review_count DESC NULLS LAST, min_price ASC";

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
         h.property_type,
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
      ORDER BY ${orderBy}
      LIMIT 100;
    `;

    const result = await pool.query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    console.error("❌ LỖI LIST_HOTELS:", error);
    return next(error);
  }
}

// ─── 2. CHI TIẾT KHÁCH SẠN THEO ID (LẤY TẤT CẢ ẢNH VÀ PHÒNG) ───
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
        `SELECT id, path, is_thumbnail, display_order, room_id 
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
           (SELECT img.path FROM public.image img WHERE img.hotel_id = r.hotel_id ORDER BY img.is_thumbnail DESC LIMIT 1)
         ) AS image,
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1),
           (SELECT img.path FROM public.image img WHERE img.hotel_id = r.hotel_id ORDER BY img.is_thumbnail DESC LIMIT 1)
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

// ─── 3. KIỂM TRA PHÒNG TRỐNG THỜI GIAN THỰC ───
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

  if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
    return res.status(400).json({
      success: false,
      message: "Ngày nhận phòng và trả phòng không hợp lệ.",
    });
  }

  try {
    const query = `
      WITH StayNights AS (
        SELECT generate_series($2::date, ($3::date - INTERVAL '1 day')::date, INTERVAL '1 day')::date AS night_date
      ),
      NightlyRoomStatus AS (
        SELECT 
          r.id AS room_id,
          sn.night_date,
          COALESCE(ri.sell_price, r.base_price) AS night_price,
          COALESCE(ri.status, 'active') AS day_status,
          GREATEST(
            0,
            COALESCE(ri.available_count, r.amount) 
            - COALESCE((
                SELECT SUM(br.quantity)::int
                FROM public.booking_room br
                JOIN public.booking b ON b.id = br.booking_id
                WHERE br.room_id = r.id 
                  AND br.book_date = sn.night_date
                  AND b.status IN ('confirmed', 'checked_in', 'pending')
              ), 0)
            - COALESCE((
                SELECT SUM(tl.quantity)::int
                FROM public.temporary_locks tl
                WHERE tl.room_id = r.id 
                  AND tl.lock_date = sn.night_date
                  AND tl.expires_at > NOW()
              ), 0)
          ) AS available_in_night
        FROM public.room r
        CROSS JOIN StayNights sn
        LEFT JOIN public.room_inventory ri 
          ON ri.room_id = r.id AND ri.inventory_date = sn.night_date
        WHERE r.hotel_id::text = $1 AND r.is_active = true
      )
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
        MIN(nrs.available_in_night)::int AS remaining_rooms,
        SUM(nrs.night_price)::int AS total_price,
        ROUND(AVG(nrs.night_price))::int AS avg_price_per_night,
        CASE 
          WHEN MIN(nrs.available_in_night) <= 0 THEN false
          WHEN BOOL_OR(nrs.day_status = 'closed') THEN false
          ELSE true
        END AS is_available,
        COALESCE(
          (SELECT img.path FROM public.image img WHERE img.room_id = r.id LIMIT 1),
          (SELECT img.path FROM public.image img WHERE img.hotel_id = r.hotel_id ORDER BY img.is_thumbnail DESC LIMIT 1)
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
      JOIN NightlyRoomStatus nrs ON nrs.room_id = r.id
      GROUP BY r.id
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

// ─── 4. GỢI Ý ĐIỂM ĐẾN & TÊN KHÁCH SẠN ───
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
        WHERE status::text IN ('active', 'approved')
          AND (unaccent(lower(city)) ILIKE unaccent(lower($1))
            OR unaccent(lower(name)) ILIKE unaccent(lower($1)))
        GROUP BY city
        UNION
        SELECT name, 1 AS hotel_count, 'hotel' AS type
        FROM public.hotel
        WHERE status::text IN ('active', 'approved')
          AND unaccent(lower(name)) ILIKE unaccent(lower($1))
        LIMIT 8;
      `;
    } else {
      query = `
        SELECT DISTINCT city AS name, COUNT(*)::int AS hotel_count, 'city' AS type
        FROM public.hotel
        WHERE status::text IN ('active', 'approved')
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
      property_type,
      propertyType,
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
      images = [],
      gallery = [],
      amenities = [],
    } = req.body;

    if (!name || !address || !city) {
      return res
        .status(400)
        .json({ message: "Tên khách sạn, địa chỉ và thành phố là bắt buộc." });
    }

    await client.query("BEGIN");

    const newHotelId = crypto.randomUUID();
    const finalPropType = property_type || propertyType || "hotel";

    const hotelInsertSql = `
      INSERT INTO public.hotel (
        id, owner_id, name, address, city, latitude, longitude,
        phone, email, star_rating, property_type, description,
        checkin_time, checkout_time,
        bank_name, bank_account, bank_account_holder, tax_code, business_license_url,
        status, commission_rate, created_at, updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, COALESCE($10, 3), $11, $12,
        COALESCE($13::time, '14:00:00'::time), COALESCE($14::time, '12:00:00'::time),
        $15, $16, $17, $18, $19,
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
      finalPropType,
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

    const extraHotelImages =
      Array.isArray(images) && images.length > 0
        ? images
        : Array.isArray(gallery)
          ? gallery
          : [];
    let order = 1;
    for (const imgItem of extraHotelImages) {
      const imgPath =
        typeof imgItem === "string" ? imgItem : imgItem.path || imgItem.url;
      if (imgPath && imgPath !== image) {
        await client.query(
          `INSERT INTO public.image (id, hotel_id, path, is_thumbnail, display_order, created_at)
           VALUES (gen_random_uuid(), $1, $2, false, $3, NOW())`,
          [newHotel.id, imgPath, order++],
        );
      }
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

        const roomImg = r.image || r.image_url || r.thumbnail;
        if (roomImg) {
          await client.query(
            `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW())`,
            [newHotel.id, newRoomId, roomImg],
          );
        }

        if (Array.isArray(r.images) && r.images.length > 0) {
          for (let rIdx = 0; rIdx < r.images.length; rIdx++) {
            const rPath =
              typeof r.images[rIdx] === "string"
                ? r.images[rIdx]
                : r.images[rIdx].url || r.images[rIdx].path;
            if (rPath && rPath !== roomImg) {
              await client.query(
                `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, false, $4, NOW())`,
                [newHotel.id, newRoomId, rPath, rIdx + 1],
              );
            }
          }
        }

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

// ─── 6. LẤY DANH SÁCH KHÁCH SẠN CỦA OWNER HOẶC LỄ TÂN ĐƯỢC GÁN ───
async function getMyHotels(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Chưa xác thực danh tính người dùng." });
    }

    const activeOnly = req.query.active_only === "true";

    // 🌟 QUAN TRỌNG: Cho phép lấy khách sạn nếu User là OWNER hoặc là LỄ TÂN (hotel_staff)
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
         ) AS room_count,
         COALESCE(
           (
             SELECT json_agg(a.name) 
             FROM public.hotel_amenity ha
             JOIN public.amenity a ON a.id = ha.amenity_id
             WHERE ha.hotel_id = h.id
           ),
           '[]'::json
         ) AS amenities
       FROM public.hotel h
       WHERE (
         h.owner_id = $1 
         OR h.id IN (SELECT hs.hotel_id FROM public.hotel_staff hs WHERE hs.user_id = $1)
       )
    `;

    const params = [userId];

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

// ─── 8. CẬP NHẬT THÔNG TIN KHÁCH SẠN (OWNER / ADMIN) ───
async function updateHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const hotelId = String(req.params.id || "").trim();
    const ownerId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!hotelId) {
      return res.status(400).json({ message: "Thiếu ID khách sạn." });
    }

    if (!ownerId) {
      return res
        .status(401)
        .json({ message: "Vui lòng đăng nhập để cập nhật khách sạn." });
    }

    const checkHotel = await client.query(
      `SELECT id, owner_id FROM public.hotel WHERE id::text = $1 LIMIT 1`,
      [hotelId],
    );

    if (checkHotel.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy khách sạn trong hệ thống." });
    }

    const {
      name,
      address,
      city,
      phone,
      email,
      star_rating,
      property_type,
      propertyType,
      description,
      checkin_time,
      checkout_time,
      overnight_checkin_time,
      overnight_checkout_time,
      hourly_grace_minutes,
      daily_grace_hours,
      bank_name,
      bank_account,
      bank_account_holder,
      tax_code,
      image,
      amenities,
    } = req.body;

    await client.query("BEGIN");

    const finalPropType = property_type || propertyType || "hotel";
    const checkInVal = checkin_time
      ? String(checkin_time).slice(0, 5) + ":00"
      : null;
    const checkOutVal = checkout_time
      ? String(checkout_time).slice(0, 5) + ":00"
      : null;
    const overnightInVal = overnight_checkin_time
      ? String(overnight_checkin_time).slice(0, 5) + ":00"
      : null;
    const overnightOutVal = overnight_checkout_time
      ? String(overnight_checkout_time).slice(0, 5) + ":00"
      : null;

    const updateSql = `
      UPDATE public.hotel
      SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        star_rating = COALESCE($6, star_rating),
        property_type = COALESCE($7, property_type),
        description = COALESCE($8, description),
        checkin_time = COALESCE($9::time, checkin_time),
        checkout_time = COALESCE($10::time, checkout_time),
        bank_name = COALESCE($11, bank_name),
        bank_account = COALESCE($12, bank_account),
        bank_account_holder = COALESCE($13, bank_account_holder),
        tax_code = COALESCE($14, tax_code),
        overnight_checkin_time = COALESCE($15::time, overnight_checkin_time),
        overnight_checkout_time = COALESCE($16::time, overnight_checkout_time),
        hourly_grace_minutes = COALESCE($17, hourly_grace_minutes),
        daily_grace_hours = COALESCE($18, daily_grace_hours),
        updated_at = NOW()
      WHERE id::text = $19
      RETURNING *;
    `;

    const updatedHotelRes = await client.query(updateSql, [
      name ? name.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      star_rating ? Number(star_rating) : null,
      finalPropType,
      description !== undefined ? description : null,
      checkInVal,
      checkOutVal,
      bank_name || null,
      bank_account || null,
      bank_account_holder || null,
      tax_code || null,
      overnightInVal,
      overnightOutVal,
      hourly_grace_minutes ? Number(hourly_grace_minutes) : null,
      daily_grace_hours ? Number(daily_grace_hours) : null,
      hotelId,
    ]);

    const updatedHotel = updatedHotelRes.rows[0];

    if (image && String(image).trim()) {
      const imgPath = String(image).trim();
      const existingThumb = await client.query(
        `SELECT id FROM public.image WHERE hotel_id = $1 AND is_thumbnail = true LIMIT 1`,
        [hotelId],
      );
      if (existingThumb.rows.length > 0) {
        await client.query(`UPDATE public.image SET path = $1 WHERE id = $2`, [
          imgPath,
          existingThumb.rows[0].id,
        ]);
      } else {
        await client.query(
          `INSERT INTO public.image (id, hotel_id, path, is_thumbnail, display_order, created_at)
           VALUES (gen_random_uuid(), $1, $2, true, 0, NOW())`,
          [hotelId, imgPath],
        );
      }
    }

    if (Array.isArray(amenities)) {
      await client.query(
        `DELETE FROM public.hotel_amenity WHERE hotel_id = $1`,
        [hotelId],
      );

      for (const amName of amenities) {
        if (!amName || !String(amName).trim()) continue;
        const cleanAmName = String(amName).trim();

        let amRes = await client.query(
          `SELECT id FROM public.amenity WHERE name ILIKE $1 LIMIT 1`,
          [cleanAmName],
        );
        let amId = amRes.rows[0]?.id;

        if (!amId) {
          const newAm = await client.query(
            `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) RETURNING id`,
            [cleanAmName],
          );
          amId = newAm.rows[0]?.id;
        }

        if (amId) {
          await client.query(
            `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [hotelId, amId],
          );
        }
      }
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cập nhật thông tin khách sạn thành công.",
      hotel: updatedHotel,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI UPDATE_HOTEL:", error);
    return next(error);
  } finally {
    client.release();
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
  updateHotel,
};
