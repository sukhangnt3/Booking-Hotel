const pool = require("../config/database");
const { formatHotel, formatRoom } = require("../utils/formatters");

function getSearchTerm(req) {
  return (req.query.destination || req.query.city || req.query.q || "")
    .toString()
    .trim();
}

function parseStarFilters(value) {
  if (!value) return [];

  return String(value)
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 1 && item <= 5);
}

function parsePositiveNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseBooleanFlag(value) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function formatPolicy(policy) {
  if (!policy) return null;

  return {
    limitedAge: policy.limited_age,
    limited_age: policy.limited_age,
    minAdultAge: policy.min_adult_age,
    min_adult_age: policy.min_adult_age,
    childrenAllowed: policy.children_allowed,
    children_allowed: policy.children_allowed,
    allowPets: policy.animal_allowed,
    animal_allowed: policy.animal_allowed,
    freeCancellation: policy.free_cancellation,
    free_cancellation: policy.free_cancellation,
    cancellationDeadlineHours: policy.cancellation_deadline_hours,
    cancellation_deadline_hours: policy.cancellation_deadline_hours,
    startCheckinTime: policy.start_checkin_time,
    start_checkin_time: policy.start_checkin_time,
    endCheckinTime: policy.end_checkin_time,
    end_checkin_time: policy.end_checkin_time,
    startCheckoutTime: policy.start_checkout_time,
    start_checkout_time: policy.start_checkout_time,
    endCheckoutTime: policy.end_checkout_time,
    end_checkout_time: policy.end_checkout_time,
    requireDeposit: policy.require_deposit,
    require_deposit: policy.require_deposit,
    depositType: policy.deposit_type,
    deposit_type: policy.deposit_type,
    depositValue: policy.deposit_value,
    deposit_value: policy.deposit_value,
  };
}

function buildHotelQuery({
  destination,
  maxPrice,
  stars,
  sortBy,
  freeCancel,
  allowPets,
  limit = 30,
}) {
  const params = [];
  const where = [
    "h.deleted_at IS NULL",
    "h.status = 'approved'",
  ];
  const having = [];

  if (destination) {
    params.push(`%${destination}%`);
    where.push(`(
      h.name ILIKE $${params.length}
      OR h.city ILIKE $${params.length}
      OR h.address ILIKE $${params.length}
    )`);
  }

  if (stars.length > 0) {
    params.push(stars);
    where.push(`h.star_rating = ANY($${params.length}::int[])`);
  }

  if (maxPrice) {
    params.push(maxPrice);
    having.push(`MIN(r.base_price) <= $${params.length}`);
  }

  if (freeCancel) {
    where.push("COALESCE(p.free_cancellation, false) = true");
  }

  if (allowPets) {
    where.push("COALESCE(p.animal_allowed, false) = true");
  }

  let orderBy = "h.average_rating DESC, h.review_count DESC, h.created_at DESC";
  if (sortBy === "price_asc") {
    orderBy = "MIN(r.base_price) ASC NULLS LAST, h.average_rating DESC, h.review_count DESC";
  } else if (sortBy === "price_desc") {
    orderBy = "MIN(r.base_price) DESC NULLS LAST, h.average_rating DESC, h.review_count DESC";
  } else if (sortBy === "rating") {
    orderBy = "h.average_rating DESC, h.review_count DESC, h.created_at DESC";
  }

  params.push(limit);

  return {
    text: `SELECT
         h.id,
         h.name,
         h.address,
         h.city,
         h.description,
         h.star_rating,
         h.average_rating,
         h.review_count,
         h.phone,
         h.email,
         thumb.path AS thumbnail,
         MIN(r.base_price) AS min_price,
         COALESCE(BOOL_OR(p.free_cancellation), false) AS free_cancellation,
         COALESCE(BOOL_OR(p.animal_allowed), false) AS animal_allowed,
         COALESCE(BOOL_OR(p.require_deposit), false) AS require_deposit,
         MAX(p.cancellation_deadline_hours) AS cancellation_deadline_hours
       FROM hotel h
       LEFT JOIN image thumb
         ON thumb.hotel_id = h.id
        AND thumb.is_thumbnail = true
       LEFT JOIN policy p
         ON p.hotel_id = h.id
       LEFT JOIN room r
         ON r.hotel_id = h.id
        AND r.is_active = true
        AND r.deleted_at IS NULL
       WHERE ${where.join(" AND ")}
       GROUP BY h.id, thumb.path
       ${having.length > 0 ? `HAVING ${having.join(" AND ")}` : ""}
       ORDER BY ${orderBy}
       LIMIT $${params.length}`,
    params,
  };
}

async function listHotels(req, res, next) {
  const destination = getSearchTerm(req);

  try {
    const query = buildHotelQuery({
      destination,
      maxPrice: null,
      stars: [],
      sortBy: "popular",
      freeCancel: false,
      allowPets: false,
      limit: 30,
    });

    const result = await pool.query(query.text, query.params);

    const hotels = result.rows.map(formatHotel);

    return res.json({
      data: hotels,
      hotels,
      total: result.rowCount,
      destination,
    });
  } catch (error) {
    return next(error);
  }
}

async function searchHotels(req, res, next) {
  const destination = getSearchTerm(req);
  const maxPrice = parsePositiveNumber(req.query.maxPrice);
  const stars = parseStarFilters(req.query.stars);
  const sortBy = (req.query.sortBy || "popular").toString();
  const freeCancel = parseBooleanFlag(req.query.freeCancel || req.query.free_cancellation);
  const allowPets = parseBooleanFlag(
    req.query.allowPets || req.query.hasPets || req.query.animalAllowed,
  );

  try {
    const query = buildHotelQuery({
      destination,
      maxPrice,
      stars,
      sortBy,
      freeCancel,
      allowPets,
      limit: 30,
    });

    const result = await pool.query(query.text, query.params);

    const hotels = result.rows.map(formatHotel);
    return res.json({
      data: hotels,
      hotels,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function listPropertyTypes(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(NULLIF(r.type, ''), 'Khách sạn') AS title,
         MIN(img.path) AS image,
         COUNT(DISTINCT h.id)::int AS total_hotels
       FROM room r
       JOIN hotel h ON h.id = r.hotel_id
       LEFT JOIN image img
         ON img.hotel_id = h.id
        AND img.is_thumbnail = true
       WHERE h.deleted_at IS NULL
        AND h.status = 'approved'
        AND r.deleted_at IS NULL
        AND r.is_active = true
       GROUP BY COALESCE(NULLIF(r.type, ''), 'Khách sạn')
       ORDER BY total_hotels DESC, title ASC
       LIMIT 8`,
    );

    const propertyTypes = result.rows.map((row, index) => ({
        id: `${index}-${row.title}`,
        title: row.title,
        image: row.image,
        totalHotels: Number(row.total_hotels || 0),
      }));

    return res.json({ data: propertyTypes, propertyTypes });
  } catch (error) {
    return next(error);
  }
}

async function listTrendingDestinations(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         h.city AS title,
         MIN(img.path) AS image,
         COUNT(*)::int AS total_hotels
       FROM hotel h
       LEFT JOIN image img
         ON img.hotel_id = h.id
        AND img.is_thumbnail = true
       WHERE h.deleted_at IS NULL
        AND h.status = 'approved'
        AND h.city IS NOT NULL
        AND h.city <> ''
       GROUP BY h.city
       ORDER BY total_hotels DESC, h.city ASC
       LIMIT 6`,
    );

    const trendingDestinations = result.rows.map((row, index) => ({
        id: `${index}-${row.title}`,
        title: row.title,
        image: row.image,
        isLarge: index < 2,
        totalHotels: Number(row.total_hotels || 0),
      }));

    return res.json({ data: trendingDestinations, trendingDestinations });
  } catch (error) {
    return next(error);
  }
}

async function listDiscoverVietnam(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         h.city AS title,
         MIN(img.path) AS image,
         COUNT(*)::int AS total_hotels
       FROM hotel h
       LEFT JOIN image img
         ON img.hotel_id = h.id
        AND img.is_thumbnail = true
       WHERE h.deleted_at IS NULL
        AND h.status = 'approved'
        AND h.city IS NOT NULL
        AND h.city <> ''
       GROUP BY h.city
       ORDER BY total_hotels DESC, h.city ASC
       LIMIT 6`,
    );

    const discoverVietnam = result.rows.map((row) => ({
        id: row.title,
        title: row.title,
        subTitle: `${Number(row.total_hotels || 0)} chỗ nghỉ`,
        image: row.image,
        totalHotels: Number(row.total_hotels || 0),
      }));

    return res.json({ data: discoverVietnam, discoverVietnam });
  } catch (error) {
    return next(error);
  }
}

async function listUniqueStays(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.city,
         h.address,
         h.star_rating,
         h.average_rating,
         h.review_count,
         thumb.path AS thumbnail,
         MIN(r.base_price) AS min_price
       FROM hotel h
       LEFT JOIN image thumb
         ON thumb.hotel_id = h.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room r
         ON r.hotel_id = h.id
        AND r.is_active = true
        AND r.deleted_at IS NULL
       WHERE h.deleted_at IS NULL
        AND h.status = 'approved'
       GROUP BY h.id, thumb.path
       ORDER BY h.average_rating DESC, h.review_count DESC, h.created_at DESC
       LIMIT 8`,
    );

    const uniqueStays = result.rows.map((hotel) => ({
        id: hotel.id,
        type: hotel.city || "Việt Nam",
        title: hotel.name,
        location: hotel.city || hotel.address,
        image: hotel.thumbnail,
        rating: Number(hotel.average_rating || 0),
        ratingText:
          Number(hotel.average_rating || 0) >= 9
            ? "Xuất sắc"
            : Number(hotel.average_rating || 0) >= 8
              ? "Tuyệt hảo"
              : "Rất tốt",
        reviewsCount: Number(hotel.review_count || 0),
        salePrice: hotel.min_price === null ? null : Number(hotel.min_price),
        stars: hotel.star_rating,
        isGenius: Number(hotel.average_rating || 0) >= 9,
      }));

    return res.json({ data: uniqueStays, uniqueStays });
  } catch (error) {
    return next(error);
  }
}

async function listDestinationSuggestions(req, res, next) {
  const keyword = getSearchTerm(req);

  try {
    const params = [];
    const where = ["h.deleted_at IS NULL", "h.status = 'approved'", "h.city IS NOT NULL", "h.city <> ''"];

    if (keyword) {
      params.push(`%${keyword}%`);
      where.push(`(
        h.city ILIKE $${params.length}
        OR h.name ILIKE $${params.length}
        OR h.address ILIKE $${params.length}
      )`);
    }

    const result = await pool.query(
      `SELECT DISTINCT
         h.city AS name,
         'Việt Nam' AS region
       FROM hotel h
       WHERE ${where.join(" AND ")}
       ORDER BY h.city ASC
       LIMIT 10`,
      params,
    );

    return res.json(result.rows);
  } catch (error) {
    return next(error);
  }
}

async function getHotelById(req, res, next) {
  try {
    const hotelResult = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.address,
         h.city,
         h.description,
         h.star_rating,
         h.average_rating,
         h.review_count,
         h.phone,
         h.email,
         thumb.path AS thumbnail,
         MIN(r.base_price) AS min_price,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
       FROM hotel h
       LEFT JOIN image thumb
         ON thumb.hotel_id = h.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room r
         ON r.hotel_id = h.id
        AND r.is_active = true
        AND r.deleted_at IS NULL
       LEFT JOIN hotel_amenity ha ON ha.hotel_id = h.id
       LEFT JOIN amenity a ON a.id = ha.amenity_id
       WHERE h.id = $1
        AND h.deleted_at IS NULL
       GROUP BY h.id, thumb.path`,
      [req.params.id],
    );

    const hotel = hotelResult.rows[0];

    if (!hotel) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    const [policyResult, serviceResult, imageResult, roomResult] = await Promise.all([
      pool.query(
        `SELECT
           limited_age,
           min_adult_age,
           children_allowed,
           animal_allowed,
           free_cancellation,
           cancellation_deadline_hours,
           start_checkin_time,
           end_checkin_time,
           start_checkout_time,
           end_checkout_time,
           require_deposit,
           deposit_type,
           deposit_value
         FROM policy
         WHERE hotel_id = $1
         LIMIT 1`,
        [req.params.id],
      ),
      pool.query(
        `SELECT
           id,
           name,
           base_price,
           description,
           is_active
         FROM hotel_service
         WHERE hotel_id = $1
          AND is_active = true
         ORDER BY base_price ASC, name ASC`,
        [req.params.id],
      ),
      pool.query(
        `SELECT
           id,
           path,
           alt_text,
           is_thumbnail,
           display_order
         FROM image
         WHERE hotel_id = $1
         ORDER BY is_thumbnail DESC, display_order ASC NULLS LAST, created_at ASC`,
        [req.params.id],
      ),
      pool.query(
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
           thumb.path AS thumbnail,
           COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
         FROM room r
         LEFT JOIN image thumb
           ON thumb.room_id = r.id
          AND thumb.is_thumbnail = true
         LEFT JOIN room_amenity ra ON ra.room_id = r.id
         LEFT JOIN amenity a ON a.id = ra.amenity_id
         WHERE r.hotel_id = $1
          AND r.deleted_at IS NULL
          AND r.is_active = true
         GROUP BY r.id, thumb.path
         ORDER BY r.base_price ASC, r.name ASC`,
        [req.params.id],
      ),
    ]);

    const images = imageResult.rows.map((image) => ({
      id: image.id,
      path: image.path,
      altText: image.alt_text,
      alt_text: image.alt_text,
      isThumbnail: image.is_thumbnail,
      is_thumbnail: image.is_thumbnail,
      displayOrder: image.display_order,
      display_order: image.display_order,
    }));

    const policy = formatPolicy(policyResult.rows[0]);

    const rooms = roomResult.rows.map(formatRoom);

    const hotelDetail = {
      ...formatHotel({ ...hotel, images, policy, services: serviceResult.rows }),
      amenities: hotel.amenities || [],
      images,
      policy,
      rooms,
      services: serviceResult.rows.map((service) => ({
        id: service.id,
        name: service.name,
        basePrice: Number(service.base_price || 0),
        base_price: Number(service.base_price || 0),
        description: service.description,
        isActive: service.is_active,
        is_active: service.is_active,
      })),
    };

    return res.json({
      data: hotelDetail,
      hotel: hotelDetail,
    });
  } catch (error) {
    return next(error);
  }
}

async function listHotelRooms(req, res, next) {
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
         thumb.path AS thumbnail,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities
       FROM room r
       LEFT JOIN image thumb
         ON thumb.room_id = r.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room_amenity ra ON ra.room_id = r.id
       LEFT JOIN amenity a ON a.id = ra.amenity_id
       WHERE r.hotel_id = $1
        AND r.deleted_at IS NULL
        AND r.is_active = true
       GROUP BY r.id, thumb.path
       ORDER BY r.base_price ASC, r.name ASC`,
      [req.params.id],
    );

    const rooms = result.rows.map(formatRoom);

    return res.json({
      data: rooms,
      rooms,
      total: result.rowCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function listHotelRoomAvailability(req, res, next) {
  const hotelId = req.params.id;
  const checkIn = req.query.checkIn;
  const checkOut = req.query.checkOut;
  const adults = Number(req.query.adults || 1);

  if (!hotelId || !checkIn || !checkOut) {
    return res.status(400).json({
      message: "hotelId, checkIn và checkOut là bắt buộc.",
    });
  }

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
         thumb.path AS thumbnail,
         COALESCE(array_agg(DISTINCT a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS amenities,
         COALESCE(MIN(ri.sell_price), r.base_price) AS sell_price,
         COALESCE(MIN(ri.available_count), r.amount) AS available_count
       FROM room r
       LEFT JOIN image thumb
         ON thumb.room_id = r.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room_amenity ra ON ra.room_id = r.id
       LEFT JOIN amenity a ON a.id = ra.amenity_id
       LEFT JOIN room_inventory ri
         ON ri.room_id = r.id
        AND ri.inventory_date >= $2::date
        AND ri.inventory_date < $3::date
        AND ri.status = 'active'
       WHERE r.hotel_id = $1
        AND r.deleted_at IS NULL
        AND r.is_active = true
       GROUP BY r.id, thumb.path
       HAVING COALESCE(MIN(ri.available_count), r.amount) >= $4
         AND r.capacity >= $4
       ORDER BY COALESCE(MIN(ri.sell_price), r.base_price) ASC, r.name ASC`,
      [hotelId, checkIn, checkOut, adults],
    );

    const rooms = result.rows.map(formatRoom);

    return res.json({
      data: rooms,
      rooms,
      total: rooms.length,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listHotels,
  searchHotels,
  listPropertyTypes,
  listTrendingDestinations,
  listDiscoverVietnam,
  listUniqueStays,
  listDestinationSuggestions,
  getHotelById,
  listHotelRooms,
  listHotelRoomAvailability,
};
