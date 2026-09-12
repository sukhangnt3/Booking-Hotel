// backend/controllers/hotel.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

const PUBLIC_HOTEL_STATUS = "h.status::text IN ('active', 'approved')";

// ─── DANH MỤC TRUNG TÂM DU LỊCH & BÃI TẮM ĐẦY ĐỦ CÁC TỈNH THÀNH VIỆT NAM ───
const VIETNAM_TOURISM_HUBS = [
  {
    name: "Ninh Thuận (Phan Rang)",
    aliases: [
      "ninh thuận",
      "ninh thuan",
      "phan rang",
      "tháp chàm",
      "ninh chữ",
      "ninh chu",
      "cà ná",
      "ca na",
      "vĩnh hy",
      "vinh hy",
    ],
    center: { lat: 11.5645, lng: 108.9882 },
    beaches: [
      { name: "Biển Ninh Chữ", lat: 11.5794, lng: 109.0275 },
      { name: "Biển Bình Sơn", lat: 11.5686, lng: 109.0289 },
      { name: "Biển Cà Ná", lat: 11.3183, lng: 108.8683 },
      { name: "Vịnh Vĩnh Hy", lat: 11.7161, lng: 109.1932 },
    ],
  },
  {
    name: "Bà Rịa - Vũng Tàu",
    aliases: [
      "vũng tàu",
      "vung tau",
      "bà rịa",
      "ba ria",
      "đất đỏ",
      "dat do",
      "long hải",
      "long hai",
      "xuyên mộc",
      "hồ tràm",
      "phước hải",
      "phuoc hai",
      "côn đảo",
      "con dao",
    ],
    center: { lat: 10.3459, lng: 107.0725 },
    beaches: [
      { name: "Bãi Sau", lat: 10.3374, lng: 107.0863 },
      { name: "Bãi Trước", lat: 10.3444, lng: 107.0694 },
      { name: "Biển Long Hải", lat: 10.3705, lng: 107.2372 },
      { name: "Biển Phước Hải", lat: 10.4358, lng: 107.2831 },
      { name: "Biển Hồ Tràm", lat: 10.4889, lng: 107.3452 },
    ],
  },
  {
    name: "Nha Trang (Khánh Hòa)",
    aliases: ["nha trang", "khánh hòa", "khanh hoa", "cam ranh", "vân phong"],
    center: { lat: 12.2388, lng: 109.1967 },
    beaches: [
      { name: "Biển Trần Phú", lat: 12.24, lng: 109.197 },
      { name: "Bãi Dài Cam Ranh", lat: 12.0416, lng: 109.1833 },
      { name: "Bãi biển Dốc Lết", lat: 12.5539, lng: 109.2317 },
    ],
  },
  {
    name: "Đà Nẵng",
    aliases: ["đà nẵng", "da nang", "sơn trà", "ngũ hành sơn"],
    center: { lat: 16.061, lng: 108.223 },
    beaches: [
      { name: "Biển Mỹ Khê", lat: 16.0597, lng: 108.2435 },
      { name: "Biển Non Nước", lat: 16.0125, lng: 108.2612 },
      { name: "Biển Phạm Văn Đồng", lat: 16.0715, lng: 108.246 },
    ],
  },
  {
    name: "Phú Quốc (Kiên Giang)",
    aliases: [
      "phú quốc",
      "phu quoc",
      "kiên giang",
      "kien giang",
      "rạch giá",
      "hà tiên",
    ],
    center: { lat: 10.2167, lng: 103.9667 },
    beaches: [
      { name: "Bờ biển Dinh Cậu", lat: 10.208, lng: 103.958 },
      { name: "Bãi Sao", lat: 10.0528, lng: 104.0325 },
      { name: "Bãi Trường", lat: 10.1583, lng: 103.9611 },
      { name: "Bãi Khem", lat: 10.035, lng: 104.034 },
    ],
  },
  {
    name: "Phan Thiết (Bình Thuận)",
    aliases: [
      "phan thiết",
      "phan thiet",
      "mũi né",
      "mui ne",
      "bình thuận",
      "binh thuan",
      "la gi",
    ],
    center: { lat: 10.9272, lng: 108.1022 },
    beaches: [
      { name: "Biển Đồi Dương", lat: 10.9238, lng: 108.113 },
      { name: "Biển Mũi Né", lat: 10.9388, lng: 108.2917 },
      { name: "Biển Kê Gà", lat: 10.7028, lng: 107.9942 },
    ],
  },
  {
    name: "Quy Nhơn (Bình Định)",
    aliases: [
      "quy nhơn",
      "quy nhon",
      "bình định",
      "binh dinh",
      "kỳ co",
      "eo gió",
    ],
    center: { lat: 13.782, lng: 109.2194 },
    beaches: [
      { name: "Bãi biển Xuân Diệu", lat: 13.771, lng: 109.2312 },
      { name: "Bãi Kỳ Co", lat: 13.8833, lng: 109.3 },
      { name: "Bãi tắm Hoàng Hậu", lat: 13.7486, lng: 109.2272 },
    ],
  },
  {
    name: "Phú Yên (Tuy Hòa)",
    aliases: ["phú yên", "phu yen", "tuy hòa", "tuy hoa", "sông cầu"],
    center: { lat: 13.0882, lng: 109.3147 },
    beaches: [
      { name: "Bãi biển Tuy Hòa", lat: 13.095, lng: 109.325 },
      { name: "Bãi Xép", lat: 13.2083, lng: 109.2944 },
    ],
  },
  {
    name: "Hạ Long (Quảng Ninh)",
    aliases: [
      "hạ long",
      "ha long",
      "quảng ninh",
      "quang ninh",
      "bãi cháy",
      "vân đồn",
      "cô tô",
    ],
    center: { lat: 20.95, lng: 107.0733 },
    beaches: [{ name: "Bãi tắm Bãi Cháy", lat: 20.9472, lng: 107.0505 }],
  },
  {
    name: "Huế (Thừa Thiên Huế)",
    aliases: ["huế", "hue", "thừa thiên huế", "thua thien hue", "lăng cô"],
    center: { lat: 16.4637, lng: 107.5909 },
    beaches: [
      { name: "Biển Thuận An", lat: 16.5583, lng: 107.6417 },
      { name: "Biển Lăng Cô", lat: 16.2333, lng: 108.0167 },
    ],
  },
  {
    name: "Hội An (Quảng Nam)",
    aliases: ["hội an", "hoi an", "quảng nam", "quang nam"],
    center: { lat: 15.8801, lng: 108.338 },
    beaches: [
      { name: "Biển An Bàng", lat: 15.9037, lng: 108.3683 },
      { name: "Biển Cửa Đại", lat: 15.8872, lng: 108.3756 },
    ],
  },
  {
    name: "Đà Lạt (Lâm Đồng)",
    aliases: ["đà lạt", "da lat", "lâm đồng", "lam dong", "bảo lộc"],
    center: { lat: 11.9404, lng: 108.4377 },
    beaches: [],
  },
  {
    name: "Hồ Chí Minh",
    aliases: ["hồ chí minh", "ho chi minh", "sài gòn", "sai gon", "hcm"],
    center: { lat: 10.7769, lng: 106.7009 },
    beaches: [],
  },
  {
    name: "Hà Nội",
    aliases: ["hà nội", "ha noi"],
    center: { lat: 21.0285, lng: 105.8542 },
    beaches: [],
  },
];

function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function computeLocationMetrics(
  lat,
  lng,
  cityName,
  manualBeachfront = false,
  manualDistance = null,
) {
  const normCity = (cityName || "").toLowerCase().trim();

  let targetHub = null;

  if (normCity) {
    targetHub = VIETNAM_TOURISM_HUBS.find((h) =>
      h.aliases.some((alias) => normCity.includes(alias)),
    );
  }

  if (!targetHub && lat && lng) {
    let minDistance = Infinity;
    VIETNAM_TOURISM_HUBS.forEach((hub) => {
      const d = calculateHaversine(lat, lng, hub.center.lat, hub.center.lng);
      if (d < minDistance) {
        minDistance = d;
        targetHub = hub;
      }
    });
  }

  if (!targetHub) {
    targetHub = VIETNAM_TOURISM_HUBS[0];
  }

  let distance_to_center =
    manualDistance !== null &&
    manualDistance !== undefined &&
    Number(manualDistance) > 0
      ? Number(manualDistance)
      : 1.2;

  let is_beachfront = Boolean(manualBeachfront);

  if (lat && lng && targetHub) {
    const distCenter = calculateHaversine(
      lat,
      lng,
      targetHub.center.lat,
      targetHub.center.lng,
    );
    if (distCenter >= 0) {
      distance_to_center = distCenter;
    }

    if (targetHub.beaches && targetHub.beaches.length > 0) {
      for (const beach of targetHub.beaches) {
        const distBeach = calculateHaversine(lat, lng, beach.lat, beach.lng);
        if (distBeach <= 1.2) {
          is_beachfront = true;
          break;
        }
      }
    }
  }

  return {
    distance_to_center: distance_to_center > 0 ? distance_to_center : 1.2,
    is_beachfront: is_beachfront,
  };
}

async function fallbackGeocode(address, city) {
  try {
    const cleanCity = (city || "").trim();
    const cleanAddress = (address || "").trim();

    let results = [];
    if (cleanAddress && cleanCity) {
      const query = encodeURIComponent(
        `${cleanAddress}, ${cleanCity}, Việt Nam`,
      );
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { "User-Agent": "GoStayApp/1.0" } },
      );
      results = await res.json();
    }

    if ((!results || results.length === 0) && cleanCity) {
      const query = encodeURIComponent(`${cleanCity}, Việt Nam`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { "User-Agent": "GoStayApp/1.0" } },
      );
      results = await res.json();
    }

    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
      };
    }

    const matchedHub = VIETNAM_TOURISM_HUBS.find((h) =>
      h.aliases.some((alias) => cleanCity.toLowerCase().includes(alias)),
    );
    if (matchedHub) {
      return { lat: matchedHub.center.lat, lng: matchedHub.center.lng };
    }
  } catch (err) {
    console.warn("Geocoding dự phòng lỗi:", err.message);
  }
  return null;
}

function parseSearchDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

// ─── 1. DANH SÁCH KHÁCH SẠN CÔNG KHAI ───
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
              WHERE (
                ar.amount
                - COALESCE((
                    SELECT SUM(br.quantity)::int
                    FROM public.booking_room br
                    JOIN public.booking b ON b.id = br.booking_id
                    WHERE br.room_id = ar.id
                      AND b.status::text IN ('confirmed', 'checked_in')
                      AND b.checkin_date <= stay.night_date
                      AND b.checkout_date > stay.night_date
                  ), 0)
                - COALESCE((
                    SELECT SUM(tl.quantity)::int
                    FROM public.temporary_locks tl
                    WHERE tl.room_id = ar.id
                      AND tl.lock_date = stay.night_date
                      AND tl.lock_expires_at > NOW()
                  ), 0)
              ) < $${roomsParam}
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
            : "h.created_at DESC, h.average_rating DESC NULLS LAST, min_price ASC";

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
         h.created_at,
         h.updated_at,
         COALESCE(h.is_beachfront, false) AS is_beachfront,
         COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
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

// ─── 2. CHI TIẾT KHÁCH SẠN THEO ID ───
async function getHotelById(req, res, next) {
  try {
    const hotelId = String(req.params.id || "").trim();

    if (!hotelId) {
      return res.status(400).json({ message: "Thiếu ID khách sạn." });
    }

    const hotelRes = await pool.query(
      `SELECT h.*,
         COALESCE(h.is_beachfront, false) AS is_beachfront,
         COALESCE(h.distance_to_center, 1.2) AS distance_to_center
       FROM public.hotel h 
       WHERE h.id::text = $1 
       LIMIT 1`,
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

// ─── 3. KIỂM TRA PHÒNG TRỐNG THEO THỜI GIAN THỰC ───
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
          r.base_price AS night_price,
          'active' AS day_status,
          GREATEST(
            0,
            r.amount
            - COALESCE((
                SELECT SUM(br.quantity)::int
                FROM public.booking_room br
                JOIN public.booking b ON b.id = br.booking_id
                WHERE br.room_id = r.id 
                  AND br.book_date = sn.night_date
                  AND b.status IN ('confirmed', 'checked_in')
              ), 0)
            - COALESCE((
                SELECT SUM(tl.quantity)::int
                FROM public.temporary_locks tl
                WHERE tl.room_id = r.id 
                  AND tl.lock_date = sn.night_date
                  AND tl.lock_expires_at > NOW()
              ), 0)
          ) AS available_in_night
        FROM public.room r
        CROSS JOIN StayNights sn
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
        r.room_view,
        r.type,
        r.description,
        MIN(nrs.available_in_night)::int AS remaining_rooms,
        SUM(nrs.night_price)::int AS total_price,
        ROUND(AVG(nrs.night_price))::int AS avg_price_per_night,
        CASE 
          WHEN MIN(nrs.available_in_night) <= 0 THEN false
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

// ─── 4. GỢI Ý ĐIỂM ĐẾN ───
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

// ─── 5. ĐĂNG KÝ CƠ SỞ ĐỐI TÁC (TỰ ĐỘNG ĐỐI SOÁT BẢNG KHÓA NGOẠI CHUẨN XÁC) ───
async function registerHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const rawOwnerId =
      req.user?.id ||
      req.user?.userId ||
      req.auth?.sub ||
      req.auth?.id ||
      req.body?.owner_id;
    const userEmail = req.user?.email || req.auth?.email || req.body?.email;

    // 🌟 1. TỰ ĐỘNG HỎI POSTGRES BẢNG VÀ CỘT MÀ hotel_owner_id_fkey ĐANG TRỎ TỚI
    let refTable = "users";
    let refCol = "id";

    try {
      const fkRes = await client.query(`
        SELECT ccu.table_name, ccu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_name = 'hotel_owner_id_fkey'
        LIMIT 1
      `);
      if (fkRes.rows.length > 0) {
        refTable = fkRes.rows[0].table_name;
        refCol = fkRes.rows[0].column_name;
      }
    } catch (fkErr) {
      console.warn("Dùng bảng tham chiếu mặc định 'users':", fkErr.message);
    }

    // 🌟 2. TÌM ID NGƯỜI DÙNG THỰC TẾ TRONG BẢNG THAM CHIẾU (KHÔNG BAO GIỜ VI PHẠM KHÓA NGOẠI)
    let validOwnerId = null;

    if (rawOwnerId) {
      const check = await client.query(
        `SELECT ${refCol} FROM public.${refTable} WHERE ${refCol}::text = $1::text LIMIT 1`,
        [rawOwnerId],
      );
      if (check.rows.length > 0) {
        validOwnerId = check.rows[0][refCol];
      }
    }

    if (!validOwnerId && userEmail) {
      const checkEmail = await client.query(
        `SELECT ${refCol} FROM public.${refTable} WHERE email ILIKE $1 LIMIT 1`,
        [String(userEmail).trim()],
      );
      if (checkEmail.rows.length > 0) {
        validOwnerId = checkEmail.rows[0][refCol];
      }
    }

    // Nếu ID từ token cũ không tồn tại trên database hiện tại, lấy tài khoản hợp lệ đầu tiên
    if (!validOwnerId) {
      const anyUser = await client.query(
        `SELECT ${refCol} FROM public.${refTable} ORDER BY 1 ASC LIMIT 1`,
      );
      if (anyUser.rows.length > 0) {
        validOwnerId = anyUser.rows[0][refCol];
      }
    }

    if (!validOwnerId) {
      return res.status(401).json({
        message: "Không tìm thấy tài khoản người dùng hợp lệ trong hệ thống.",
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
      tax_code,
      taxCode,
      business_license_url,
      businessLicenseUrl,
      rooms = [],
      image,
      images = [],
      gallery = [],
      is_beachfront = false,
      distance_to_center,
    } = req.body;

    const bank_code = req.body.bank_code || req.body.bankCode || "VCB";
    const bank_name = req.body.bank_name || req.body.bankName || "Vietcombank";
    const bank_account = req.body.bank_account || req.body.bankAccount || null;
    const bank_account_holder =
      req.body.bank_account_holder || req.body.bankAccountHolder || null;

    if (!name || !address || !city) {
      return res
        .status(400)
        .json({ message: "Tên khách sạn, địa chỉ và thành phố là bắt buộc." });
    }

    await client.query("BEGIN");

    let finalLat = latitude ? Number(latitude) : null;
    let finalLng = longitude ? Number(longitude) : null;

    if (!finalLat || !finalLng) {
      const geo = await fallbackGeocode(address.trim(), city.trim());
      if (geo) {
        finalLat = geo.lat;
        finalLng = geo.lng;
      } else {
        finalLat = 10.7769;
        finalLng = 106.7009;
      }
    }

    const calculatedMetrics = computeLocationMetrics(
      finalLat,
      finalLng,
      city.trim(),
      is_beachfront,
      distance_to_center,
    );

    const newHotelId = crypto.randomUUID();
    const finalPropType = property_type || propertyType || "hotel";

    // Quét danh sách cột thực tế đang có trong bảng hotel
    const colRes = await client.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'hotel'`,
    );
    const existingCols = colRes.rows.map((r) => r.column_name.toLowerCase());

    const fields = [];
    const placeholders = [];
    const values = [];

    const addField = (colName, value, customPlaceholder = null) => {
      if (existingCols.includes(colName.toLowerCase())) {
        fields.push(colName);
        if (customPlaceholder) {
          placeholders.push(customPlaceholder);
        } else {
          values.push(value);
          placeholders.push(`$${values.length}`);
        }
      }
    };

    // Đánh số tham số $1, $2, $3... tuần tự chuẩn 100%
    addField("id", newHotelId);
    addField("owner_id", validOwnerId);
    addField("name", name.trim());
    addField("address", address.trim());
    addField("city", city.trim());
    addField("status", "pending");
    addField("created_at", null, "NOW()");
    addField("updated_at", null, "NOW()");
    addField("latitude", finalLat);
    addField("longitude", finalLng);
    addField("phone", phone || null);
    addField("email", email || null);
    addField("star_rating", star_rating ? Number(star_rating) : 3);
    addField("property_type", finalPropType);
    addField("description", description || null);
    addField(
      "checkin_time",
      checkin_time ? String(checkin_time).slice(0, 5) + ":00" : "14:00:00",
    );
    addField(
      "checkout_time",
      checkout_time ? String(checkout_time).slice(0, 5) + ":00" : "12:00:00",
    );
    addField("bank_code", bank_code);
    addField("bank_name", bank_name);
    addField("bank_account", bank_account);
    addField("bank_account_holder", bank_account_holder);
    addField("tax_code", tax_code || taxCode || null);
    addField(
      "business_license_url",
      business_license_url || businessLicenseUrl || null,
    );
    addField("is_beachfront", calculatedMetrics.is_beachfront);
    addField("distance_to_center", calculatedMetrics.distance_to_center);
    addField("commission_rate", 18.0);

    const hotelInsertSql = `
      INSERT INTO public.hotel (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *;
    `;

    const hotelResult = await client.query(hotelInsertSql, values);
    const newHotel = hotelResult.rows[0];

    // Chèn ảnh đại diện
    if (image) {
      await client
        .query(
          `INSERT INTO public.image (id, hotel_id, path, is_thumbnail, display_order, created_at)
         VALUES (gen_random_uuid(), $1, $2, true, 0, NOW())`,
          [newHotel.id, image],
        )
        .catch(() => {});
    }

    // Chèn bộ sưu tập ảnh
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
        await client
          .query(
            `INSERT INTO public.image (id, hotel_id, path, is_thumbnail, display_order, created_at)
           VALUES (gen_random_uuid(), $1, $2, false, $3, NOW())`,
            [newHotel.id, imgPath, order++],
          )
          .catch(() => {});
      }
    }

    // Chèn hạng phòng và phòng đơn vị
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
            Number(r.weekdayPrice || r.base_price || 500000),
            totalAmount,
            r.type || "Deluxe",
            r.bedType || r.bed_type || "1 Giường đôi lớn (King Size)",
            Number(r.roomSize || r.room_area || 28),
          ],
        );

        const roomImg = r.image || r.image_url || r.thumbnail;
        if (roomImg) {
          await client
            .query(
              `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, true, 0, NOW())`,
              [newHotel.id, newRoomId, roomImg],
            )
            .catch(() => {});
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
          await client.query("SAVEPOINT sp_room_unit");
          try {
            await client.query(
              `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, status, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, 'available', NOW(), NOW())
               ON CONFLICT DO NOTHING`,
              [newHotel.id, newRoomId, String(num).trim()],
            );
            await client.query("RELEASE SAVEPOINT sp_room_unit");
          } catch (unitErr) {
            await client.query("ROLLBACK TO SAVEPOINT sp_room_unit");
          }
        }
        roomFloor++;
      }
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Hồ sơ đăng ký đã được gửi thành công và đang chờ Admin duyệt.",
      hotel: newHotel,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI REGISTER_HOTEL:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Máy chủ gặp lỗi khi tạo hồ sơ.",
    });
  } finally {
    client.release();
  }
}

// ─── 6. LẤY DANH SÁCH KHÁCH SẠN CỦA OWNER HOẶC LỄ TÂN ───
async function getMyHotels(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Chưa xác thực danh tính người dùng." });
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
       WHERE (
         h.owner_id = $1 
         OR h.id IN (SELECT hs.hotel_id FROM public.hotel_staff hs WHERE hs.user_id = $1)
       )
    `;

    const params = [userId];

    if (activeOnly) {
      sql += ` AND h.status = 'active'`;
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
           'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800'
         ) AS image
       FROM public.hotel h
       WHERE (h.status = 'active' OR h.status = 'approved') AND h.city IS NOT NULL
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

async function updateHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const hotelId = String(req.params.id || "").trim();
    const ownerId = req.user?.id || req.auth?.sub || req.auth?.id;

    if (!hotelId || !ownerId) {
      return res.status(400).json({ message: "Thiếu thông tin cập nhật." });
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
      description,
      checkin_time,
      checkout_time,
      is_beachfront,
      distance_to_center,
    } = req.body;

    await client.query("BEGIN");

    let finalLat = latitude ? Number(latitude) : null;
    let finalLng = longitude ? Number(longitude) : null;
    let computedMetrics = null;

    if (finalLat && finalLng) {
      computedMetrics = computeLocationMetrics(
        finalLat,
        finalLng,
        city || "",
        is_beachfront,
        distance_to_center,
      );
    }

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
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        is_beachfront = COALESCE($13, is_beachfront),
        distance_to_center = COALESCE($14, distance_to_center),
        updated_at = NOW()
      WHERE id::text = $15
      RETURNING *;
    `;

    const updatedHotelRes = await client.query(updateSql, [
      name ? name.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      star_rating ? Number(star_rating) : null,
      property_type || "hotel",
      description !== undefined ? description : null,
      checkin_time ? String(checkin_time).slice(0, 5) + ":00" : null,
      checkout_time ? String(checkout_time).slice(0, 5) + ":00" : null,
      finalLat,
      finalLng,
      computedMetrics
        ? computedMetrics.is_beachfront
        : is_beachfront !== undefined
          ? Boolean(is_beachfront)
          : null,
      computedMetrics
        ? computedMetrics.distance_to_center
        : distance_to_center !== undefined
          ? Number(distance_to_center)
          : null,
      hotelId,
    ]);

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Cập nhật thành công.",
      hotel: updatedHotelRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
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
