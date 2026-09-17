// backend/controllers/hotel.controller.js
const crypto = require("crypto");
const pool = require("../config/database");

// Tự động nâng cấp kiểu dữ liệu path thành TEXT và tạo các cột lưu ảnh riêng cho room
(async function ensureDatabaseSchema() {
  try {
    await pool.query(`
      ALTER TABLE public.image ALTER COLUMN path TYPE text;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS image text;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS thumbnail text;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;
      ALTER TABLE public.room ADD COLUMN IF NOT EXISTS room_view text DEFAULT 'city_view';
      ALTER TABLE public.hotel ALTER COLUMN image TYPE text;
    `);
  } catch (err) {
    console.warn("⚠️ Cảnh báo migration image/room columns:", err.message);
  }
})();

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  try {
    bcrypt = require("bcrypt");
  } catch {
    bcrypt = null;
  }
}

let jwt;
try {
  jwt = require("jsonwebtoken");
} catch {
  jwt = null;
}

const PUBLIC_HOTEL_STATUS = "h.status::text IN ('active', 'approved')";

const AMENITY_LABEL_MAP = {
  wifi: "Wi-Fi miễn phí toàn khuôn viên",
  parking: "Bãi đỗ xe ô tô tại chỗ nghỉ",
  "24h_front_desk": "Lễ tân phục vụ 24/7",
  pool_outdoor: "Hồ bơi ngoài trời / Vô cực",
  pool_indoor: "Hồ bơi trong nhà / Nước ấm",
  restaurant: "Nhà hàng & Khu ẩm thực",
  bar: "Quầy Bar / Lounge",
  private_beach: "Bãi biển riêng",
  spa: "Dịch vụ Spa & Massage",
  gym: "Phòng tập thể dục / Gym",
  elevator: "Thang máy di chuyển",
  air_conditioner: "Điều hòa máy lạnh",
  laundry: "Dịch vụ giặt ủi",
  airport_shuttle: "Đưa đón sân bay",
  pets_allowed: "Cho phép mang thú cưng",
  sauna: "Xông hơi (Sauna)",
  tv_smart: "Smart TV màn hình phẳng",
  hot_water: "Bình nóng lạnh",
  bathtub: "Bồn tắm nằm",
  balcony: "Ban công / Sân hiên",
  hair_dryer: "Máy sấy tóc",
  refrigerator: "Tủ lạnh / Minibar",
  kettle: "Ấm đun nước siêu tốc",
  toiletries: "Đồ vệ sinh cá nhân miễn phí",
};

const parseAmenityArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return (item.name || item.id || item.label || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s) => s.trim().replace(/^["'{}[\]]+|["'{}[\]]+$/g, ""))
      .filter(Boolean);
  }
  return [];
};

const extractImageUrls = (raw) => {
  if (!raw) return [];
  const list = [];
  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (typeof item === "string" && item.trim()) {
        list.push(item.trim());
      } else if (item && typeof item === "object") {
        const u =
          item.url || item.path || item.image_url || item.thumbnail || "";
        if (u && typeof u === "string" && u.trim()) list.push(u.trim());
      }
    });
  } else if (typeof raw === "string" && raw.trim()) {
    list.push(raw.trim());
  } else if (typeof raw === "object") {
    const u = raw.url || raw.path || raw.image_url || raw.thumbnail || "";
    if (u && typeof u === "string" && u.trim()) list.push(u.trim());
  }
  return list.filter((url) => !url.startsWith("blob:"));
};

async function ensureAmenityRecord(client, rawItem) {
  if (!rawItem) return null;
  const clean =
    typeof rawItem === "string"
      ? rawItem.trim()
      : String(rawItem.name || rawItem.id || rawItem.label || "").trim();
  if (!clean) return null;
  const label = AMENITY_LABEL_MAP[clean] || clean;

  try {
    const found = await client.query(
      `SELECT id FROM public.amenity 
       WHERE id::text = $1 
          OR LOWER(name) = LOWER($1) 
          OR LOWER(name) = LOWER($2) 
       LIMIT 1`,
      [clean, label],
    );
    if (found.rows.length > 0) {
      return found.rows[0].id;
    }

    const nameToUse = AMENITY_LABEL_MAP[clean] ? clean : label;
    const ins = await client.query(
      `INSERT INTO public.amenity (id, name, created_at) 
       VALUES (gen_random_uuid(), $1, NOW()) 
       RETURNING id`,
      [nameToUse],
    );
    return ins.rows[0]?.id;
  } catch (err) {
    try {
      const ins2 = await client.query(
        `INSERT INTO public.amenity (name) VALUES ($1) RETURNING id`,
        [clean],
      );
      return ins2.rows[0]?.id;
    } catch {
      return null;
    }
  }
}

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

  if (!targetHub) targetHub = VIETNAM_TOURISM_HUBS[0];

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
    if (distCenter >= 0) distance_to_center = distCenter;

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
    const rentalType = req.query.rentalType || "DAY";

    if (
      rentalType === "DAY" &&
      (req.query.checkIn || req.query.checkOut) &&
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
             WHERE img.hotel_id = h.id AND img.room_id IS NULL
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

// ─── 2. CHI TIẾT KHÁCH SẠN THEO ID (TRUY VẤN AN TOÀN, HIỂN THỊ ĐỦ PHÒNG) ───
async function getHotelById(req, res, next) {
  try {
    const hotelId = String(req.params.id || "").trim();
    if (!hotelId)
      return res.status(400).json({ message: "Thiếu ID khách sạn." });

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
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    const hotelData = hotelRes.rows[0];

    // Chỉ lấy ảnh cơ sở (room_id IS NULL)
    const imagesRes = await pool
      .query(
        `SELECT id, path, is_thumbnail, display_order, room_id 
         FROM public.image 
         WHERE hotel_id = $1 AND room_id IS NULL
         ORDER BY is_thumbnail DESC, display_order ASC, created_at ASC`,
        [hotelData.id],
      )
      .catch(() => ({ rows: [] }));

    // Truy vấn phòng: Ưu tiên lấy ảnh có room_id khớp trong bảng image hoặc r.image
    const roomsRes = await pool
      .query(
        `SELECT 
         r.*,
         COALESCE(
           NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0),
           r.amount,
           1
         ) AS amount,
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id::text = r.id::text ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1),
           r.image,
           r.thumbnail
         ) AS image,
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id::text = r.id::text ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1),
           r.thumbnail,
           r.image
         ) AS thumbnail,
         COALESCE(
           (
             SELECT json_agg(a.name) 
             FROM public.room_amenity ra 
             JOIN public.amenity a ON a.id = ra.amenity_id 
             WHERE ra.room_id::text = r.id::text
           ), 
           '[]'::json
         ) AS amenities,
         COALESCE(
           (SELECT json_agg(img.path) FROM public.image img WHERE img.room_id::text = r.id::text),
           '[]'::json
         ) AS images
       FROM public.room r
       WHERE r.hotel_id::text = $1 AND (r.is_active = true OR r.is_active IS NULL)
       ORDER BY r.base_price ASC`,
        [hotelData.id],
      )
      .catch((err) => {
        console.error("❌ Lỗi roomsRes:", err.message);
        return { rows: [] };
      });

    const amenitiesRes = await pool
      .query(
        `SELECT DISTINCT a.name, a.type 
         FROM public.amenity a
         JOIN public.hotel_amenity ha ON ha.amenity_id = a.id 
         WHERE ha.hotel_id = $1`,
        [hotelData.id],
      )
      .catch(() => ({ rows: [] }));

    hotelData.images = imagesRes.rows;
    hotelData.rooms = roomsRes.rows;
    hotelData.amenities = amenitiesRes.rows.map((row) => row.name);

    if (
      (!hotelData.amenities || hotelData.amenities.length === 0) &&
      hotelRes.rows[0]?.amenities
    ) {
      hotelData.amenities = parseAmenityArray(hotelRes.rows[0].amenities);
    }

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
            COALESCE(
              NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0),
              r.amount,
              1
            )
            - COALESCE((
                SELECT COUNT(DISTINCT b.id)::int
                FROM public.booking b
                WHERE b.checkin_date <= sn.night_date
                  AND b.checkout_date > sn.night_date
                  AND b.status NOT IN ('checked_out', 'cancelled')
                  AND (
                    b.status IN ('confirmed', 'checked_in')
                    OR (b.status = 'pending' AND (b.payment_status = 'paid' OR b.created_at >= NOW() - INTERVAL '15 minutes'))
                  )
                  AND (
                    EXISTS (SELECT 1 FROM public.booking_room br WHERE br.booking_id = b.id AND br.room_id = r.id)
                    OR b.room_number IN (SELECT ru.room_number FROM public.room_unit ru WHERE ru.room_id = r.id)
                  )
              ), 0)
            - COALESCE((
                SELECT SUM(tl.quantity)::int
                FROM public.temporary_locks tl
                WHERE tl.room_id = r.id 
                  AND tl.lock_date = sn.night_date
                  AND (
                    (tl.lock_expires_at IS NOT NULL AND tl.lock_expires_at > NOW())
                    OR (tl.expires_at IS NOT NULL AND tl.expires_at > NOW())
                  )
              ), 0)
          ) AS available_in_night
        FROM public.room r
        CROSS JOIN StayNights sn
        WHERE r.hotel_id::text = $1 AND (r.is_active = true OR r.is_active IS NULL)
      )
      SELECT 
        r.id,
        r.hotel_id,
        r.name,
        r.capacity,
        r.base_price,
        COALESCE(
          NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0),
          r.amount,
          1
        ) AS total_rooms,
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
          (SELECT img.path FROM public.image img WHERE img.room_id::text = r.id::text ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1),
          r.thumbnail,
          r.image
        ) AS thumbnail,
        COALESCE(
          (SELECT img.path FROM public.image img WHERE img.room_id::text = r.id::text ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1),
          r.image,
          r.thumbnail
        ) AS image,
        COALESCE(
          (
            SELECT json_agg(a.name) 
            FROM public.room_amenity ra 
            JOIN public.amenity a ON a.id = ra.amenity_id 
            WHERE ra.room_id::text = r.id::text
          ), 
          '[]'::json
        ) AS amenities,
        COALESCE(
          (SELECT json_agg(img.path) FROM public.image img WHERE img.room_id::text = r.id::text),
          '[]'::json
        ) AS images
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
    return res.json({ success: true, data: [], destinations: [] });
  }
}

// ─── 5. ĐĂNG KÝ CƠ SỞ ĐỐI TÁC ───
async function registerHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const rawOwnerId =
      req.user?.id ||
      req.user?.userId ||
      req.auth?.sub ||
      req.auth?.id ||
      req.body?.owner_id;
    const userEmail =
      req.body?.emailContact ||
      req.body?.email ||
      req.user?.email ||
      req.auth?.email;
    const userPassword = req.body?.password;
    const ownerFullName = req.body?.ownerName || req.body?.name || "Chủ cơ sở";
    const userPhone = req.body?.phoneContact || req.body?.phone;

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
    } catch (fkErr) {}

    const uColRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${refTable}'`,
    );
    const existingUserCols = uColRes.rows.map((r) =>
      r.column_name.toLowerCase(),
    );

    let validOwnerId = null;

    if (userEmail) {
      const emailCheck = await client.query(
        `SELECT ${refCol} FROM public.${refTable} WHERE email ILIKE $1 LIMIT 1`,
        [String(userEmail).trim()],
      );

      if (emailCheck.rows.length > 0) {
        validOwnerId = emailCheck.rows[0][refCol];
      } else if (userPassword) {
        const newUserId = crypto.randomUUID();
        const hashedPassword = bcrypt
          ? await bcrypt.hash(userPassword, 10)
          : userPassword;

        const uFields = [refCol, "email"];
        const uValues = [newUserId, String(userEmail).trim().toLowerCase()];
        const uPlaceholders = ["$1", "$2"];

        if (existingUserCols.includes("password")) {
          uFields.push("password");
          uValues.push(hashedPassword);
          uPlaceholders.push(`$${uValues.length}`);
        }

        if (existingUserCols.includes("full_name")) {
          uFields.push("full_name");
          uValues.push(ownerFullName);
          uPlaceholders.push(`$${uValues.length}`);
        } else if (existingUserCols.includes("name")) {
          uFields.push("name");
          uValues.push(ownerFullName);
          uPlaceholders.push(`$${uValues.length}`);
        }

        if (existingUserCols.includes("phone") && userPhone) {
          uFields.push("phone");
          uValues.push(userPhone);
          uPlaceholders.push(`$${uValues.length}`);
        }

        if (existingUserCols.includes("role")) {
          uFields.push("role");
          uValues.push("hotel_owner");
          uPlaceholders.push(`$${uValues.length}`);
        }

        if (existingUserCols.includes("created_at")) {
          uFields.push("created_at");
          uPlaceholders.push("NOW()");
        }
        if (existingUserCols.includes("updated_at")) {
          uFields.push("updated_at");
          uPlaceholders.push("NOW()");
        }

        const insertUserSql = `
          INSERT INTO public.${refTable} (${uFields.join(", ")})
          VALUES (${uPlaceholders.join(", ")})
          RETURNING ${refCol};
        `;

        const newUserRes = await client.query(insertUserSql, uValues);
        validOwnerId = newUserRes.rows[0][refCol];
      }
    }

    if (!validOwnerId && rawOwnerId) {
      const checkId = await client.query(
        `SELECT ${refCol} FROM public.${refTable} WHERE ${refCol}::text = $1::text LIMIT 1`,
        [rawOwnerId],
      );
      if (checkId.rows.length > 0) {
        validOwnerId = checkId.rows[0][refCol];
      }
    }

    if (!validOwnerId) {
      return res.status(401).json({
        message:
          "Không tìm thấy hoặc không thể tạo tài khoản chủ cơ sở hợp lệ.",
      });
    }

    await client.query("BEGIN");

    try {
      const roleRes = await client.query(
        `INSERT INTO public.roles (id, name) 
         VALUES (gen_random_uuid(), 'HOTEL_OWNER') 
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name 
         RETURNING id`,
      );
      const ownerRoleId = roleRes.rows[0]?.id;

      if (ownerRoleId && validOwnerId) {
        await client.query(
          `INSERT INTO public.user_roles (user_id, role_id) 
           VALUES ($1::uuid, $2::uuid) 
           ON CONFLICT DO NOTHING`,
          [validOwnerId, ownerRoleId],
        );
      }

      if (existingUserCols.includes("role") && validOwnerId) {
        await client.query(
          `UPDATE public.${refTable} 
           SET role = 'hotel_owner', updated_at = NOW() 
           WHERE ${refCol}::text = $1::text`,
          [validOwnerId],
        );
      }
    } catch (roleErr) {
      console.warn("⚠️ Cảnh báo gán role HOTEL_OWNER:", roleErr.message);
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
      hotelImages = [],
      hotelMainImage,
      is_beachfront = false,
      distance_to_center,
      propertyAmenities,
      property_amenities,
      amenities,
    } = req.body;

    const bank_code = req.body.bank_code || req.body.bankCode || "VCB";
    const bank_name = req.body.bank_name || req.body.bankName || "Vietcombank";
    const bank_account = req.body.bank_account || req.body.bankAccount || null;
    const bank_account_holder =
      req.body.bank_account_holder || req.body.bankAccountHolder || null;

    if (!name || !address || !city) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: "Tên khách sạn, địa chỉ và thành phố là bắt buộc." });
    }

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

    const colRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hotel'`,
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
    addField("phone", phone || userPhone || null);
    addField("email", email || userEmail || null);
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

    // ── 5.1. XỬ LÝ ẢNH CƠ SỞ (TÁCH BẠCH KHỎI ẢNH PHÒNG) ──
    const allRoomImageUrls = new Set();
    if (Array.isArray(rooms)) {
      rooms.forEach((rm) => {
        extractImageUrls([rm.images, rm.image, rm.thumbnail]).forEach((u) =>
          allRoomImageUrls.add(u),
        );
      });
    }
    if (Array.isArray(hotelImages)) {
      hotelImages
        .filter((img) => img.roomId || img.room_id)
        .forEach((img) => {
          const u = img.url || img.path;
          if (u) allRoomImageUrls.add(u);
        });
    }

    const propertyImagesFromHotelImages = Array.isArray(hotelImages)
      ? hotelImages
          .filter((img) => !img.roomId && !img.room_id)
          .map((img) => img.url || img.path || img)
      : [];

    const rawHotelImages = [
      hotelMainImage,
      ...propertyImagesFromHotelImages,
      image,
      ...(Array.isArray(images) ? images : []),
      ...(Array.isArray(gallery) ? gallery : []),
    ];

    const mainHotelImages = extractImageUrls(rawHotelImages).filter(
      (url) => !allRoomImageUrls.has(url),
    );

    for (let i = 0; i < mainHotelImages.length; i++) {
      await client.query("SAVEPOINT sp_hotel_img");
      try {
        await client.query(
          `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
           VALUES (gen_random_uuid(), $1, NULL, $2, $3, $4, NOW())`,
          [newHotel.id, mainHotelImages[i], i === 0, i],
        );
        await client.query("RELEASE SAVEPOINT sp_hotel_img");
      } catch (e) {
        await client.query("ROLLBACK TO SAVEPOINT sp_hotel_img");
      }
    }

    if (existingCols.includes("image") && mainHotelImages.length > 0) {
      await client
        .query(`UPDATE public.hotel SET image = $1 WHERE id = $2`, [
          mainHotelImages[0],
          newHotel.id,
        ])
        .catch(() => {});
    }

    // ── 5.2. TIỆN NGHI KHÁCH SẠN ──
    const hotelAmenitiesList = parseAmenityArray(
      propertyAmenities || property_amenities || amenities,
    );
    for (const am of hotelAmenitiesList) {
      const amenId = await ensureAmenityRecord(client, am);
      if (amenId) {
        await client.query("SAVEPOINT sp_hotel_amen");
        try {
          await client.query(
            `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newHotel.id, amenId],
          );
          await client.query("RELEASE SAVEPOINT sp_hotel_amen");
        } catch {
          await client.query("ROLLBACK TO SAVEPOINT sp_hotel_amen");
        }
      }
    }

    // ── 5.3. XỬ LÝ HẠNG PHÒNG VÀ GÁN ĐÚNG ẢNH TỪNG PHÒNG ──
    const roomColRes = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'room'`,
    );
    const existingRoomCols = roomColRes.rows.map((r) =>
      r.column_name.toLowerCase(),
    );

    if (Array.isArray(rooms) && rooms.length > 0) {
      let roomFloor = 1;
      for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
        const r = rooms[rIdx];
        const totalAmount = Number(r.totalRooms || r.amount || 4);
        const newRoomId = crypto.randomUUID();

        const roomPhotosFromStep5 = Array.isArray(hotelImages)
          ? hotelImages
              .filter((img) => img.roomId === r.id || img.room_id === r.id)
              .map((img) => img.url || img.path)
          : [];

        const thisRoomImages = extractImageUrls([
          ...(Array.isArray(r.images) ? r.images : []),
          r.image,
          r.imageUrl,
          r.image_url,
          r.thumbnail,
          ...roomPhotosFromStep5,
        ]);

        const uniqueRoomImages = [...new Set(thisRoomImages)];
        const primaryRoomImage = uniqueRoomImages[0] || null;

        const roomFields = [];
        const roomPlaceholders = [];
        const roomValues = [];

        const addRoomField = (colName, val, customPlaceholder = null) => {
          if (existingRoomCols.includes(colName.toLowerCase())) {
            roomFields.push(colName);
            if (customPlaceholder) {
              roomPlaceholders.push(customPlaceholder);
            } else {
              roomValues.push(val);
              roomPlaceholders.push(`$${roomValues.length}`);
            }
          }
        };

        const basePrice = Number(r.weekdayPrice || r.base_price || 500000);
        addRoomField("id", newRoomId);
        addRoomField("hotel_id", newHotel.id);
        addRoomField("name", r.roomName || r.name || "Phòng Tiêu Chuẩn");
        addRoomField("capacity", Number(r.maxAdults || r.capacity || 2));
        addRoomField("base_price", basePrice);
        addRoomField("amount", totalAmount);
        addRoomField("type", r.type || "Deluxe");
        addRoomField(
          "bed_type",
          r.bedType || r.bed_type || "1 Giường đôi lớn (King Size)",
        );
        addRoomField("room_area", Number(r.roomSize || r.room_area || 28));
        addRoomField(
          "room_view",
          r.room_view || r.roomView || r.view || "city_view",
        );
        addRoomField("description", r.description || null);
        addRoomField("code", r.code || `P${String(rIdx + 1).padStart(3, "0")}`);
        addRoomField(
          "hourly_price",
          Number(r.hourly_price || Math.round(basePrice * 0.25)),
        );
        addRoomField("overnight_price", Number(r.overnight_price || basePrice));
        addRoomField("image", primaryRoomImage);
        addRoomField("thumbnail", primaryRoomImage);
        addRoomField("is_active", true);
        addRoomField("created_at", null, "NOW()");
        addRoomField("updated_at", null, "NOW()");

        await client.query(
          `INSERT INTO public.room (${roomFields.join(", ")}) VALUES (${roomPlaceholders.join(", ")})`,
          roomValues,
        );

        for (let imgIdx = 0; imgIdx < uniqueRoomImages.length; imgIdx++) {
          await client.query("SAVEPOINT sp_room_img");
          try {
            await client.query(
              `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
              [
                newHotel.id,
                newRoomId,
                uniqueRoomImages[imgIdx],
                imgIdx === 0,
                imgIdx,
              ],
            );
            await client.query("RELEASE SAVEPOINT sp_room_img");
          } catch (e) {
            await client.query("ROLLBACK TO SAVEPOINT sp_room_img");
          }
        }

        const roomAmenitiesList = parseAmenityArray(
          r.roomAmenities || r.amenities || r.room_amenities,
        );
        for (const am of roomAmenitiesList) {
          const amenId = await ensureAmenityRecord(client, am);
          if (amenId) {
            await client.query("SAVEPOINT sp_rm_amen");
            try {
              await client.query(
                `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [newRoomId, amenId],
              );
              await client.query("RELEASE SAVEPOINT sp_rm_amen");
            } catch {
              await client.query("ROLLBACK TO SAVEPOINT sp_rm_amen");
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

    let freshToken = null;
    if (jwt) {
      try {
        const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_key_gostay";
        freshToken = jwt.sign(
          {
            id: validOwnerId,
            userId: validOwnerId,
            email: userEmail,
            role: "HOTEL_OWNER",
            roles: ["HOTEL_OWNER", "CUSTOMER"],
          },
          JWT_SECRET,
          { expiresIn: "7d" },
        );
      } catch (jwtErr) {}
    }

    return res.status(201).json({
      success: true,
      message: "Hồ sơ đăng ký đã được gửi thành công và đang chờ Admin duyệt.",
      hotel: newHotel,
      token: freshToken,
      accessToken: freshToken,
      user: {
        id: validOwnerId,
        email: userEmail,
        name: ownerFullName,
        role: "HOTEL_OWNER",
        roles: ["HOTEL_OWNER", "CUSTOMER"],
      },
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

async function getMyHotels(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId)
      return res.status(401).json({ message: "Chưa xác thực danh tính." });

    const activeOnly = req.query.active_only === "true";

    let sql = `
      SELECT 
         h.*,
         COALESCE(
           (
             SELECT img.path 
             FROM public.image img 
             WHERE img.hotel_id = h.id AND img.room_id IS NULL
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
    if (activeOnly) sql += ` AND h.status = 'active'`;
    sql += ` ORDER BY h.created_at DESC`;

    const result = await pool.query(sql, params);
    return res.json({
      success: true,
      data: result.rows,
      hotels: result.rows,
    });
  } catch (error) {
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
             WHERE h2.city = h.city AND img.room_id IS NULL
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

    if (!hotelId || !ownerId)
      return res.status(400).json({ message: "Thiếu thông tin cập nhật." });

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
      tax_code,
      amenities,
      propertyAmenities,
    } = req.body;

    const bank_code = req.body.bank_code || req.body.bankCode || null;
    const bank_name = req.body.bank_name || req.body.bankName || null;
    const bank_account = req.body.bank_account || req.body.bankAccount || null;
    const bank_account_holder =
      req.body.bank_account_holder || req.body.bankAccountHolder || null;

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
        bank_code = COALESCE($15, bank_code),
        bank_name = COALESCE($16, bank_name),
        bank_account = COALESCE($17, bank_account),
        bank_account_holder = COALESCE($18, bank_account_holder),
        tax_code = COALESCE($19, tax_code),
        updated_at = NOW()
      WHERE id::text = $20
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
      bank_code,
      bank_name,
      bank_account,
      bank_account_holder,
      tax_code || null,
      hotelId,
    ]);

    const newAmenities = parseAmenityArray(propertyAmenities || amenities);
    if (newAmenities.length > 0) {
      await client.query(
        `DELETE FROM public.hotel_amenity WHERE hotel_id::text = $1`,
        [hotelId],
      );
      for (const am of newAmenities) {
        const amenId = await ensureAmenityRecord(client, am);
        if (amenId) {
          await client
            .query(
              `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [hotelId, amenId],
            )
            .catch(() => {});
        }
      }
    }

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
         COALESCE(
           (SELECT img.path FROM public.image img WHERE img.room_id::text = r.id::text ORDER BY img.is_thumbnail DESC LIMIT 1),
           r.thumbnail,
           r.image
         ) AS thumbnail,
         COALESCE(
           (
             SELECT json_agg(a.name) 
             FROM public.room_amenity ra 
             JOIN public.amenity a ON a.id = ra.amenity_id 
             WHERE ra.room_id::text = r.id::text
           ), 
           '[]'::json
         ) AS amenities
       FROM public.room r 
       WHERE r.hotel_id::text = $1 AND (r.is_active = true OR r.is_active IS NULL)
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
