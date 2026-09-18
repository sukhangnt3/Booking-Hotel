// backend/controllers/hotel.controller.js
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

const safeRequire = (mod) => {
  try {
    return require(mod);
  } catch {
    return null;
  }
};
const bcrypt = safeRequire("bcryptjs") || safeRequire("bcrypt");
const jwt = safeRequire("jsonwebtoken");

const PUBLIC_HOTEL_STATUS = "h.status = 'active'";

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
      .map((i) =>
        (typeof i === "string" ? i : i?.name || i?.id || i?.label || "").trim(),
      )
      .filter(Boolean);
  }
  return typeof raw === "string"
    ? raw
        .split(",")
        .map((s) => s.trim().replace(/^["'{}[\]]+|["'{}[\]]+$|_/g, ""))
        .filter(Boolean)
    : [];
};

// 🌟 HÀM LƯU BASE64 DÙNG MD5 HASH (ĐẢM BẢO ẢNH TRÙNG SẼ CÙNG TÊN FILE, KHÔNG BỊ NHÂN ĐÔI)
const base64Cache = new Map();

const saveBase64ToFile = (rawString) => {
  if (
    !rawString ||
    typeof rawString !== "string" ||
    !rawString.startsWith("data:image/")
  ) {
    return rawString;
  }

  if (base64Cache.has(rawString)) {
    return base64Cache.get(rawString);
  }

  try {
    const matches = rawString.match(
      /^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/,
    );
    if (!matches) return rawString;

    const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
    const buffer = Buffer.from(matches[2], "base64");

    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");
    const fileName = `hotel_${fileHash}.${ext}`;
    const uploadsDir = path.resolve("uploads");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer);
    }

    const publicUrl = `/uploads/${fileName}`;
    base64Cache.set(rawString, publicUrl);
    return publicUrl;
  } catch (err) {
    console.warn("⚠️ Lỗi lưu base64 thành file:", err.message);
    return rawString;
  }
};

const extractImageUrls = (raw) => {
  const list = [];
  const seen = new Set();

  const walk = (item) => {
    if (!item) return;
    if (Array.isArray(item)) return item.forEach(walk);
    let u = (
      typeof item === "string"
        ? item
        : item.url || item.path || item.image_url || item.thumbnail || ""
    ).trim();

    if (u && !u.startsWith("blob:")) {
      if (u.startsWith("data:image/")) {
        u = saveBase64ToFile(u);
      }
      if (!seen.has(u)) {
        seen.add(u);
        list.push(u);
      }
    }
  };
  walk(raw);
  return list;
};

async function ensureAmenityRecord(client, rawItem) {
  if (!rawItem) return null;
  const clean = (
    typeof rawItem === "string"
      ? rawItem
      : rawItem.name || rawItem.id || rawItem.label || ""
  ).trim();
  if (!clean) return null;
  const label = AMENITY_LABEL_MAP[clean] || clean;

  const found = await client.query(
    `SELECT id FROM public.amenity WHERE id::text = $1 OR LOWER(name) IN (LOWER($1), LOWER($2)) LIMIT 1`,
    [clean, label],
  );
  if (found.rows.length) return found.rows[0].id;

  const res = await client
    .query(
      `INSERT INTO public.amenity (id, name, created_at) VALUES (gen_random_uuid(), $1, NOW()) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
      [AMENITY_LABEL_MAP[clean] ? clean : label],
    )
    .catch(() =>
      client.query(
        `INSERT INTO public.amenity (name) VALUES ($1) RETURNING id`,
        [clean],
      ),
    );

  return res.rows?.[0]?.id || null;
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
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return (
    Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
  );
}

function computeLocationMetrics(
  lat,
  lng,
  cityName,
  manualBeachfront = false,
  manualDistance = null,
) {
  const normCity = (cityName || "").toLowerCase().trim();
  let hub = normCity
    ? VIETNAM_TOURISM_HUBS.find((h) =>
        h.aliases.some((a) => normCity.includes(a)),
      )
    : null;

  if (!hub && lat && lng) {
    hub = VIETNAM_TOURISM_HUBS.reduce((closest, curr) => {
      const d = calculateHaversine(lat, lng, curr.center.lat, curr.center.lng);
      return !closest || d < closest.d ? { hub: curr, d } : closest;
    }, null)?.hub;
  }
  hub = hub || VIETNAM_TOURISM_HUBS[0];

  let dist = Number(manualDistance) > 0 ? Number(manualDistance) : 1.2;
  let beachfront = Boolean(manualBeachfront);

  if (lat && lng && hub) {
    dist = calculateHaversine(lat, lng, hub.center.lat, hub.center.lng);
    beachfront =
      beachfront ||
      hub.beaches.some(
        (b) => calculateHaversine(lat, lng, b.lat, b.lng) <= 1.2,
      );
  }

  return {
    distance_to_center: dist > 0 ? dist : 1.2,
    is_beachfront: beachfront,
  };
}

async function fallbackGeocode(address, city) {
  try {
    const query = [address, city, "Việt Nam"].filter(Boolean).join(", ");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "GoStayApp/1.0" },
      },
    ).then((r) => r.json());

    if (res?.[0])
      return { lat: parseFloat(res[0].lat), lng: parseFloat(res[0].lon) };
    const hub = VIETNAM_TOURISM_HUBS.find((h) =>
      h.aliases.some((a) => (city || "").toLowerCase().includes(a)),
    );
    if (hub) return { lat: hub.center.lat, lng: hub.center.lng };
  } catch (err) {
    console.warn("Geocoding fallback lỗi:", err.message);
  }
  return null;
}

const parseSearchDate = (v) =>
  v && !isNaN(new Date(v).getTime())
    ? new Date(v).toISOString().slice(0, 10)
    : null;

const ROOM_BASE_SELECT = `
  SELECT r.*,
    COALESCE(NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0), r.amount, 1)::int AS amount,
    COALESCE(NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0), r.amount, 1)::int AS remaining_rooms,
    COALESCE(NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0), r.amount, 1)::int AS total_rooms,
    r.base_price::int AS total_price,
    r.base_price::int AS avg_price_per_night,
    true AS is_available,
    COALESCE((SELECT img.path FROM public.image img WHERE img.room_id = r.id ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), '') AS image,
    COALESCE((SELECT img.path FROM public.image img WHERE img.room_id = r.id ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), '') AS thumbnail,
    COALESCE((SELECT json_agg(a.name) FROM public.room_amenity ra JOIN public.amenity a ON a.id = ra.amenity_id WHERE ra.room_id = r.id), '[]'::json) AS amenities,
    COALESCE((SELECT json_agg(img.path ORDER BY img.is_thumbnail DESC, img.display_order ASC) FROM public.image img WHERE img.room_id = r.id), '[]'::json) AS images
  FROM public.room r
`;

// ─── 1. DANH SÁCH KHÁCH SẠN ───
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
      req.query.rentalType === "DAY" &&
      (req.query.checkIn || req.query.checkOut) &&
      (!checkIn || !checkOut || checkOut <= checkIn)
    ) {
      return res.status(400).json({
        success: false,
        message: "Ngày nhận phòng và trả phòng không hợp lệ.",
      });
    }

    const minPrice = Number(req.query.minPrice || 0);
    const maxPrice = Number(req.query.maxPrice || 0);
    const stars = String(req.query.stars || "")
      .split(",")
      .map(Number)
      .filter((s) => Number.isFinite(s) && s > 0);

    const params = [];
    let where = `WHERE ${PUBLIC_HOTEL_STATUS}`;

    if (destination) {
      const normDest = destination
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
      const variants =
        normDest.includes("khanh hoa") || normDest.includes("nha trang")
          ? ["%Khánh Hòa%", "%Nha Trang%", "%Khanh Hoa%"]
          : [`%${destination}%`];

      const conds = variants.map((v) => {
        params.push(v);
        const idx = `$${params.length}`;
        return `(h.name ILIKE ${idx} OR h.city ILIKE ${idx} OR h.address ILIKE ${idx} OR unaccent(lower(h.name)) ILIKE unaccent(lower(${idx})) OR unaccent(lower(h.city)) ILIKE unaccent(lower(${idx})))`;
      });
      where += ` AND (${conds.join(" OR ")})`;
    }

    if (stars.length) {
      params.push(stars);
      where += ` AND h.star_rating = ANY($${params.length}::int[])`;
    }
    if (minPrice > 0) {
      params.push(minPrice);
      where += ` AND EXISTS (SELECT 1 FROM public.room rp WHERE rp.hotel_id = h.id AND COALESCE(rp.is_active, true) AND rp.base_price >= $${params.length})`;
    }
    if (maxPrice > 0) {
      params.push(maxPrice);
      where += ` AND EXISTS (SELECT 1 FROM public.room rp WHERE rp.hotel_id = h.id AND COALESCE(rp.is_active, true) AND rp.base_price <= $${params.length})`;
    }

    const orderByMap = {
      price_low: "min_price ASC, h.average_rating DESC NULLS LAST",
      price_high: "min_price DESC, h.average_rating DESC NULLS LAST",
      rating: "h.average_rating DESC NULLS LAST, min_price ASC",
    };
    const orderBy =
      orderByMap[req.query.sortBy] ||
      "h.created_at DESC, h.average_rating DESC NULLS LAST, min_price ASC";

    const sql = `
      SELECT h.*,
        COALESCE(h.is_beachfront, false) AS is_beachfront,
        COALESCE(h.distance_to_center, 1.2) AS distance_to_center,
        COALESCE((SELECT img.path FROM public.image img WHERE img.hotel_id = h.id AND img.room_id IS NULL ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600') AS image,
        COALESCE((SELECT MIN(r.base_price) FROM public.room r WHERE r.hotel_id = h.id AND COALESCE(r.is_active, true)), 500000) AS min_price
      FROM public.hotel h
      ${where}
      ORDER BY ${orderBy}
      LIMIT 100;
    `;

    const result = await pool.query(sql, params);
    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

// ─── 2. CHI TIẾT KHÁCH SẠN THEO ID ───
async function getHotelById(req, res, next) {
  try {
    const rawId = String(req.params.id || "").trim();
    if (!rawId) return res.status(400).json({ message: "Thiếu ID khách sạn." });

    const [hotelRes, imagesRes, roomsRes, amenitiesRes] = await Promise.all([
      pool.query(
        `SELECT h.*, COALESCE(h.is_beachfront, false) AS is_beachfront, COALESCE(h.distance_to_center, 1.2) AS distance_to_center FROM public.hotel h WHERE h.id::text = $1 LIMIT 1`,
        [rawId],
      ),
      pool
        .query(
          `SELECT id, path, is_thumbnail, display_order FROM public.image WHERE hotel_id = $1 AND room_id IS NULL ORDER BY is_thumbnail DESC, display_order ASC, created_at ASC`,
          [rawId],
        )
        .catch(() => ({ rows: [] })),
      pool
        .query(
          `${ROOM_BASE_SELECT} WHERE r.hotel_id = $1 ORDER BY r.base_price ASC`,
          [rawId],
        )
        .catch(() => ({ rows: [] })),
      pool
        .query(
          `SELECT DISTINCT a.name, a.type FROM public.amenity a JOIN public.hotel_amenity ha ON ha.amenity_id = a.id WHERE ha.hotel_id = $1`,
          [rawId],
        )
        .catch(() => ({ rows: [] })),
    ]);

    if (!hotelRes.rows.length)
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });

    const hotel = hotelRes.rows[0];
    hotel.images = imagesRes.rows;
    hotel.image = imagesRes.rows[0]?.path || null;
    hotel.rooms = roomsRes.rows;
    hotel.amenities = amenitiesRes.rows.map((r) => r.name);

    return res.json({ success: true, data: hotel, hotel });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 3. CHECK PHÒNG TRỐNG (ĐÃ TỐI ƯU CHÍNH XÁC THỜI GIAN GIAO THOA VÀ DỌN PHÒNG) ───
async function listHotelRoomAvailability(req, res) {
  const { id: hotelId } = req.params;
  const checkIn =
    req.query.checkIn ||
    req.query.checkin_date ||
    new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
  const checkOut = req.query.checkOut || req.query.checkout_date || tomorrow;
  const checkInTime = req.query.checkInTime || "12:00";
  const checkOutTime = req.query.checkOutTime || "14:00";

  const inTime = checkInTime.length === 5 ? `${checkInTime}:00` : "12:00:00";
  const outTime = checkOutTime.length === 5 ? `${checkOutTime}:00` : "14:00:00";

  try {
    const query = `
      SELECT r.*,
        COALESCE(NULLIF((SELECT COUNT(ru.id)::int FROM public.room_unit ru WHERE ru.room_id = r.id), 0), r.amount, 1)::int AS total_stock,
        r.base_price::int AS total_price,
        r.base_price::int AS avg_price_per_night,
        COALESCE((SELECT img.path FROM public.image img WHERE img.room_id = r.id ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), '') AS image,
        COALESCE((SELECT img.path FROM public.image img WHERE img.room_id = r.id ORDER BY img.is_thumbnail DESC, img.display_order ASC LIMIT 1), '') AS thumbnail,
        COALESCE((SELECT json_agg(a.name) FROM public.room_amenity ra JOIN public.amenity a ON a.id = ra.amenity_id WHERE ra.room_id = r.id), '[]'::json) AS amenities,
        COALESCE((SELECT json_agg(img.path ORDER BY img.is_thumbnail DESC, img.display_order ASC) FROM public.image img WHERE img.room_id = r.id), '[]'::json) AS images,
        
        -- 🌟 THUẬT TOÁN KIỂM TRA TRÙNG LẶP THỜI GIAN CHÍNH XÁC TUYỆT ĐỐI
        (
          SELECT COALESCE(SUM(br.quantity), 0)::int
          FROM public.booking b
          JOIN public.booking_room br ON br.booking_id = b.id
          WHERE br.room_id = r.id
            AND b.status NOT IN ('checked_out', 'cancelled')
            AND (
              b.status IN ('confirmed', 'checked_in')
              OR (
                b.status = 'pending' 
                AND (b.payment_status = 'paid' OR b.created_at >= NOW() - INTERVAL '15 minutes')
              )
            )
            AND (
              -- Kiểm tra giao thoa: StartA < EndB AND EndA > StartB
              $2::timestamp < (b.checkout_date::timestamp + COALESCE(b.checkout_time, '12:00:00'::time) + INTERVAL '30 minutes')
              AND $3::timestamp > (b.checkin_date::timestamp + COALESCE(b.checkin_time, '14:00:00'::time))
            )
        ) AS booked_count
      FROM public.room r
      WHERE r.hotel_id = $1 AND COALESCE(r.is_active, true)
      ORDER BY r.base_price ASC
    `;

    const result = await pool.query(query, [
      hotelId,
      `${checkIn}T${inTime}`,
      `${checkOut}T${outTime}`,
    ]);

    const rooms = result.rows.map((row) => {
      const total = Number(row.total_stock || 1);
      const booked = Number(row.booked_count || 0);
      const availableStock = Math.max(0, total - booked);

      return {
        ...row,
        amount: availableStock,
        remaining_rooms: availableStock,
        total_rooms: total,
        booked_count: booked,
        is_available: availableStock > 0,
      };
    });

    return res.json({
      success: true,
      data: rooms,
      rooms: rooms,
      checkIn,
      checkOut,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// ─── 4. GỢI Ý ĐIỂM ĐẾN ───
async function listDestinationSuggestions(req, res) {
  const kw = (req.query.q || req.query.keyword || "").trim();
  try {
    const sql = kw
      ? `
      SELECT DISTINCT city AS name, COUNT(*)::int AS hotel_count, 'city' AS type FROM public.hotel
      WHERE status = 'active' AND (unaccent(lower(city)) ILIKE unaccent(lower($1)) OR unaccent(lower(name)) ILIKE unaccent(lower($1)))
      GROUP BY city
      UNION
      SELECT name, 1 AS hotel_count, 'hotel' AS type FROM public.hotel
      WHERE status = 'active' AND unaccent(lower(name)) ILIKE unaccent(lower($1))
      LIMIT 8;
    `
      : `
      SELECT DISTINCT city AS name, COUNT(*)::int AS hotel_count, 'city' AS type FROM public.hotel
      WHERE status = 'active' AND city IS NOT NULL GROUP BY city ORDER BY hotel_count DESC LIMIT 6;
    `;
    const result = await pool.query(sql, kw ? [`%${kw}%`] : []);
    return res.json({
      success: true,
      data: result.rows,
      destinations: result.rows,
    });
  } catch {
    return res.json({ success: true, data: [], destinations: [] });
  }
}

// ─── 5. ĐĂNG KÝ KHÁCH SẠN ───
async function registerHotel(req, res) {
  const client = await pool.connect();
  try {
    const b = req.body || {};
    const rawOwnerId =
      req.user?.id || req.user?.userId || req.auth?.sub || b.owner_id;
    const userEmail =
      b.emailContact || b.email || req.user?.email || req.auth?.email;
    let validOwnerId = null;

    if (userEmail) {
      const emailCheck = await client.query(
        `SELECT id FROM public.users WHERE email ILIKE $1 LIMIT 1`,
        [String(userEmail).trim()],
      );
      if (emailCheck.rows.length) {
        validOwnerId = emailCheck.rows[0].id;
      } else if (b.password) {
        const hash = bcrypt ? await bcrypt.hash(b.password, 10) : b.password;
        const newUser = await client.query(
          `INSERT INTO public.users (id, full_name, email, password, phone, activate, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) RETURNING id`,
          [
            crypto.randomUUID(),
            b.ownerName || b.name || "Chủ cơ sở",
            String(userEmail).trim().toLowerCase(),
            hash,
            b.phoneContact || b.phone || null,
          ],
        );
        validOwnerId = newUser.rows[0].id;
      }
    }

    if (!validOwnerId && rawOwnerId) {
      const checkId = await client.query(
        `SELECT id FROM public.users WHERE id::text = $1::text LIMIT 1`,
        [rawOwnerId],
      );
      if (checkId.rows.length) validOwnerId = checkId.rows[0].id;
    }

    if (!validOwnerId)
      return res.status(401).json({
        message:
          "Không tìm thấy hoặc không thể tạo tài khoản chủ cơ sở hợp lệ.",
      });

    if (!b.name || !b.address || !b.city) {
      return res
        .status(400)
        .json({ message: "Tên khách sạn, địa chỉ và thành phố là bắt buộc." });
    }

    await client.query("BEGIN");

    const roleRes = await client.query(
      `INSERT INTO public.roles (id, name) VALUES (gen_random_uuid(), 'HOTEL_OWNER') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    );
    if (roleRes.rows[0]?.id) {
      await client.query(
        `INSERT INTO public.user_roles (user_id, role_id) VALUES ($1::uuid, $2::uuid) ON CONFLICT DO NOTHING`,
        [validOwnerId, roleRes.rows[0].id],
      );
    }

    let lat = Number(b.latitude),
      lng = Number(b.longitude);
    if (!lat || !lng) {
      const geo = await fallbackGeocode(b.address.trim(), b.city.trim());
      lat = geo ? geo.lat : 10.7769;
      lng = geo ? geo.lng : 106.7009;
    }

    const metrics = computeLocationMetrics(
      lat,
      lng,
      b.city.trim(),
      b.is_beachfront,
      b.distance_to_center,
    );
    const newHotelId = crypto.randomUUID();

    const hotelResult = await client.query(
      `INSERT INTO public.hotel (
        id, owner_id, name, address, city, latitude, longitude, phone, email,
        star_rating, property_type, description, checkin_time, checkout_time,
        bank_code, bank_name, bank_account, bank_account_holder, tax_code,
        business_license_url, is_beachfront, distance_to_center, commission_rate,
        status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 18.00, 'pending', NOW(), NOW()) RETURNING *`,
      [
        newHotelId,
        validOwnerId,
        b.name.trim(),
        b.address.trim(),
        b.city.trim(),
        lat,
        lng,
        b.phone || b.phoneContact || null,
        b.email || userEmail || null,
        b.star_rating ? Number(b.star_rating) : 3,
        b.property_type || b.propertyType || "hotel",
        b.description || null,
        b.checkin_time
          ? String(b.checkin_time).slice(0, 5) + ":00"
          : "14:00:00",
        b.checkout_time
          ? String(b.checkout_time).slice(0, 5) + ":00"
          : "12:00:00",
        b.bank_code || b.bankCode || "VCB",
        b.bank_name || b.bankName || "Vietcombank",
        b.bank_account || b.bankAccount || null,
        b.bank_account_holder || b.bankAccountHolder || null,
        b.tax_code || null,
        b.business_license_url || b.businessLicenseUrl || null,
        metrics.is_beachfront,
        metrics.distance_to_center,
      ],
    );

    const rooms = Array.isArray(b.rooms || b.roomList || b.room_data)
      ? b.rooms || b.roomList || b.room_data
      : [];
    const roomPhotosMap = new Map();
    const allRoomImageSet = new Set();

    rooms.forEach((r, idx) => {
      const roomUrls = extractImageUrls([
        r.images,
        r.image,
        r.imageUrl,
        r.thumbnail,
        r.photos,
      ]);

      roomUrls.forEach((u) => allRoomImageSet.add(u));
      roomPhotosMap.set(idx, [...new Set(roomUrls)]);
    });

    const rawFacilitySources = b.hotelImages || b.images || [];
    const facilityUrls = extractImageUrls(rawFacilitySources).filter(
      (url) => !allRoomImageSet.has(url),
    );

    if (b.image) {
      const coverUrl = extractImageUrls(b.image)[0];
      if (
        coverUrl &&
        !facilityUrls.includes(coverUrl) &&
        !allRoomImageSet.has(coverUrl)
      ) {
        facilityUrls.unshift(coverUrl);
      }
    }

    if (facilityUrls.length) {
      const imgValues = facilityUrls
        .map(
          (url, i) =>
            `(gen_random_uuid(), '${newHotelId}', NULL, '${url.replace(/'/g, "''")}', ${i === 0}, ${i}, NOW())`,
        )
        .join(",");
      await client
        .query(
          `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at) VALUES ${imgValues}`,
        )
        .catch((e) => console.error("Lỗi lưu ảnh KS:", e.message));
    }

    const hotelAms = parseAmenityArray(
      b.propertyAmenities || b.property_amenities || b.amenities,
    );
    for (const am of hotelAms) {
      const amenId = await ensureAmenityRecord(client, am);
      if (amenId)
        await client
          .query(
            `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [newHotelId, amenId],
          )
          .catch(() => {});
    }

    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      const r = rooms[rIdx];
      const newRoomId = crypto.randomUUID();
      const totalAmount = Number(r.totalRooms || r.amount || 4);
      const basePrice = Number(r.weekdayPrice || r.base_price || 500000);

      await client.query(
        `INSERT INTO public.room (
          id, hotel_id, name, capacity, base_price, amount, type, bed_type,
          room_area, room_view, description, code, hourly_price, overnight_price,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW())`,
        [
          newRoomId,
          newHotelId,
          r.roomName || r.name || "Phòng Tiêu Chuẩn",
          Number(r.maxAdults || r.capacity || 2),
          basePrice,
          totalAmount,
          r.type || "Deluxe",
          r.bedType || r.bed_type || "1 Giường đôi lớn (King Size)",
          Number(r.roomSize || r.room_area || 28),
          r.room_view || r.roomView || r.view || "city_view",
          r.description || null,
          r.code || `P${String(rIdx + 1).padStart(3, "0")}`,
          Number(r.hourly_price || Math.round(basePrice * 0.25)),
          Number(r.overnight_price || basePrice),
        ],
      );

      const rImages = roomPhotosMap.get(rIdx) || [];
      if (rImages.length) {
        const rImgValues = rImages
          .map(
            (u, i) =>
              `(gen_random_uuid(), NULL, '${newRoomId}', '${u.replace(/'/g, "''")}', ${i === 0}, ${i}, NOW())`,
          )
          .join(",");
        await client
          .query(
            `INSERT INTO public.image (id, hotel_id, room_id, path, is_thumbnail, display_order, created_at) VALUES ${rImgValues}`,
          )
          .catch((e) => console.error("Lỗi lưu ảnh phòng:", e.message));
      }

      for (const am of parseAmenityArray(
        r.roomAmenities || r.amenities || r.room_amenities,
      )) {
        const amenId = await ensureAmenityRecord(client, am);
        if (amenId)
          await client
            .query(
              `INSERT INTO public.room_amenity (room_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [newRoomId, amenId],
            )
            .catch(() => {});
      }

      const roomNumbers =
        Array.isArray(r.room_numbers) && r.room_numbers.length
          ? r.room_numbers
          : Array.from(
              { length: totalAmount },
              (_, i) => `P.${rIdx + 1}0${i + 1}`,
            );

      await client
        .query(
          `INSERT INTO public.room_unit (id, hotel_id, room_id, room_number, status, created_at, updated_at)
         SELECT gen_random_uuid(), $1, $2, num, 'available', NOW(), NOW() FROM unnest($3::text[]) AS num ON CONFLICT DO NOTHING`,
          [newHotelId, newRoomId, roomNumbers],
        )
        .catch(() => {});
    }

    await client.query("COMMIT");

    const freshToken = jwt
      ? jwt.sign(
          {
            id: validOwnerId,
            userId: validOwnerId,
            email: userEmail,
            role: "HOTEL_OWNER",
            roles: ["HOTEL_OWNER", "CUSTOMER"],
          },
          process.env.JWT_SECRET || "jwt_secret_key_gostay",
          { expiresIn: "7d" },
        )
      : null;

    return res.status(201).json({
      success: true,
      message: "Hồ sơ đăng ký đã được gửi thành công và đang chờ Admin duyệt.",
      hotel: hotelResult.rows[0],
      token: freshToken,
      accessToken: freshToken,
      user: {
        id: validOwnerId,
        email: userEmail,
        name: b.ownerName || b.name || "Chủ cơ sở",
        role: "HOTEL_OWNER",
        roles: ["HOTEL_OWNER", "CUSTOMER"],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      message: error.message || "Máy chủ gặp lỗi khi tạo hồ sơ.",
    });
  } finally {
    client.release();
  }
}

// ─── 6. KHÁCH SẠN CỦA TÔI ───
async function getMyHotels(req, res, next) {
  try {
    const userId = req.user?.id || req.auth?.sub || req.auth?.id;
    if (!userId)
      return res.status(401).json({ message: "Chưa xác thực danh tính." });

    let sql = `
      SELECT h.*,
        COALESCE((SELECT img.path FROM public.image img WHERE img.hotel_id = h.id AND img.room_id IS NULL ORDER BY img.is_thumbnail DESC, img.created_at ASC LIMIT 1), 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600') AS image,
        (SELECT COUNT(*)::int FROM public.room r WHERE r.hotel_id = h.id) AS room_count
      FROM public.hotel h
      WHERE (h.owner_id = $1 OR h.id IN (SELECT hs.hotel_id FROM public.hotel_staff hs WHERE hs.user_id = $1))
      ${req.query.active_only === "true" ? " AND h.status = 'active'" : ""}
      ORDER BY h.created_at DESC
    `;
    const result = await pool.query(sql, [userId]);
    return res.json({ success: true, data: result.rows, hotels: result.rows });
  } catch (error) {
    return next(error);
  }
}

// ─── 7. ĐIỂM ĐẾN PHỔ BIẾN ───
async function listTrendingDestinations(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT h.city AS title, h.city AS name, COUNT(*)::int AS hotelCount,
        COALESCE((SELECT img.path FROM public.image img JOIN public.hotel h2 ON h2.id = img.hotel_id WHERE h2.city = h.city AND img.room_id IS NULL LIMIT 1), 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800') AS image
      FROM public.hotel h WHERE h.status = 'active' AND h.city IS NOT NULL
      GROUP BY h.city ORDER BY hotelCount DESC LIMIT 8
    `);
    return res.json({
      success: true,
      data: result.rows,
      trendingDestinations: result.rows,
    });
  } catch (error) {
    return next(error);
  }
}

// ─── 8. CẬP NHẬT KHÁCH SẠN ───
async function updateHotel(req, res, next) {
  const client = await pool.connect();
  try {
    const hotelId = String(req.params.id || "").trim();
    if (!hotelId)
      return res.status(400).json({ message: "Thiếu thông tin cập nhật." });

    const b = req.body || {};
    await client.query("BEGIN");

    let lat = b.latitude ? Number(b.latitude) : null;
    let lng = b.longitude ? Number(b.longitude) : null;
    const metrics =
      lat && lng
        ? computeLocationMetrics(
            lat,
            lng,
            b.city || "",
            b.is_beachfront,
            b.distance_to_center,
          )
        : null;

    const updateSql = `
      UPDATE public.hotel SET 
        name = COALESCE($1, name), address = COALESCE($2, address), city = COALESCE($3, city),
        phone = COALESCE($4, phone), email = COALESCE($5, email), star_rating = COALESCE($6, star_rating),
        property_type = COALESCE($7, property_type), description = COALESCE($8, description),
        checkin_time = COALESCE($9::time, checkin_time), checkout_time = COALESCE($10::time, checkout_time),
        latitude = COALESCE($11, latitude), longitude = COALESCE($12, longitude),
        is_beachfront = COALESCE($13, is_beachfront), distance_to_center = COALESCE($14, distance_to_center),
        bank_code = COALESCE($15, bank_code), bank_name = COALESCE($16, bank_name),
        bank_account = COALESCE($17, bank_account), bank_account_holder = COALESCE($18, bank_account_holder),
        tax_code = COALESCE($19, tax_code), updated_at = NOW()
      WHERE id::text = $20 RETURNING *;
    `;

    const updated = await client.query(updateSql, [
      b.name?.trim() || null,
      b.address?.trim() || null,
      b.city?.trim() || null,
      b.phone?.trim() || null,
      b.email?.trim() || null,
      b.star_rating ? Number(b.star_rating) : null,
      b.property_type || "hotel",
      b.description !== undefined ? b.description : null,
      b.checkin_time ? String(b.checkin_time).slice(0, 5) + ":00" : null,
      b.checkout_time ? String(b.checkout_time).slice(0, 5) + ":00" : null,
      lat,
      lng,
      metrics
        ? metrics.is_beachfront
        : b.is_beachfront !== undefined
          ? Boolean(b.is_beachfront)
          : null,
      metrics
        ? metrics.distance_to_center
        : b.distance_to_center !== undefined
          ? Number(b.distance_to_center)
          : null,
      b.bank_code || b.bankCode || null,
      b.bank_name || b.bankName || null,
      b.bank_account || b.bankAccount || null,
      b.bank_account_holder || b.bankAccountHolder || null,
      b.tax_code || null,
      hotelId,
    ]);

    const newAmenities = parseAmenityArray(b.propertyAmenities || b.amenities);
    if (newAmenities.length) {
      await client.query(
        `DELETE FROM public.hotel_amenity WHERE hotel_id::text = $1`,
        [hotelId],
      );
      for (const am of newAmenities) {
        const amenId = await ensureAmenityRecord(client, am);
        if (amenId)
          await client
            .query(
              `INSERT INTO public.hotel_amenity (hotel_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [hotelId, amenId],
            )
            .catch(() => {});
      }
    }

    await client.query("COMMIT");
    return res.json({
      success: true,
      message: "Cập nhật thành công.",
      hotel: updated.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return next(error);
  } finally {
    client.release();
  }
}

// ─── 9. LẤY DANH SÁCH PHÒNG THEO HOTEL_ID ───
async function listHotelRooms(req, res, next) {
  try {
    const r = await pool.query(
      `${ROOM_BASE_SELECT} WHERE r.hotel_id = $1 ORDER BY r.base_price ASC`,
      [req.params.id],
    );
    return res.json({ success: true, data: r.rows, rooms: r.rows });
  } catch (e) {
    return next(e);
  }
}

// ─── 10. PLACEHOLDERS ───
const searchHotels = listHotels;
const listPropertyTypes = (req, res) => res.json({ success: true, data: [] });
const listDiscoverVietnam = (req, res) => res.json({ success: true, data: [] });
const listUniqueStays = (req, res) => res.json({ success: true, data: [] });

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
