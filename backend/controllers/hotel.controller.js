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

    return res.json({
      hotels: result.rows.map(formatHotel),
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

    return res.json(result.rows.map(formatHotel));
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

    return res.json({
      propertyTypes: result.rows.map((row, index) => ({
        id: `${index}-${row.title}`,
        title: row.title,
        image: row.image,
        totalHotels: Number(row.total_hotels || 0),
      })),
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

    return res.json({
      trendingDestinations: result.rows.map((row, index) => ({
        id: `${index}-${row.title}`,
        title: row.title,
        image: row.image,
        isLarge: index < 2,
        totalHotels: Number(row.total_hotels || 0),
      })),
    });
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

    return res.json({
      discoverVietnam: result.rows.map((row) => ({
        id: row.title,
        title: row.title,
        subTitle: `${Number(row.total_hotels || 0)} chỗ nghỉ`,
        image: row.image,
        totalHotels: Number(row.total_hotels || 0),
      })),
    });
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

    return res.json({
      uniqueStays: result.rows.map((hotel) => ({
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
      })),
    });
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

    const [policyResult, serviceResult] = await Promise.all([
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
    ]);

    return res.json({
      hotel: {
        ...formatHotel(hotel),
        amenities: hotel.amenities || [],
        policy: policyResult.rows[0]
          ? {
              limitedAge: policyResult.rows[0].limited_age,
              minAdultAge: policyResult.rows[0].min_adult_age,
              childrenAllowed: policyResult.rows[0].children_allowed,
              allowPets: policyResult.rows[0].animal_allowed,
              freeCancellation: policyResult.rows[0].free_cancellation,
              cancellationDeadlineHours: policyResult.rows[0].cancellation_deadline_hours,
              startCheckinTime: policyResult.rows[0].start_checkin_time,
              endCheckinTime: policyResult.rows[0].end_checkin_time,
              startCheckoutTime: policyResult.rows[0].start_checkout_time,
              endCheckoutTime: policyResult.rows[0].end_checkout_time,
              requireDeposit: policyResult.rows[0].require_deposit,
              depositType: policyResult.rows[0].deposit_type,
              depositValue: policyResult.rows[0].deposit_value,
            }
          : null,
        services: serviceResult.rows.map((service) => ({
          id: service.id,
          name: service.name,
          basePrice: Number(service.base_price || 0),
          description: service.description,
          isActive: service.is_active,
        })),
      },
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

    return res.json({
      rooms: result.rows.map(formatRoom),
      total: result.rowCount,
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
};
