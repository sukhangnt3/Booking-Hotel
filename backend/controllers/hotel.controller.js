const pool = require("../config/database");
const { formatHotel, formatRoom } = require("../utils/formatters");

async function listHotels(req, res, next) {
  const destination = (req.query.destination || req.query.city || req.query.q || "")
    .toString()
    .trim();

  try {
    const params = [];
    const where = [
      "h.deleted_at IS NULL",
      "h.status = 'approved'",
    ];

    if (destination) {
      params.push(`%${destination}%`);
      where.push(`(
        h.name ILIKE $${params.length}
        OR h.city ILIKE $${params.length}
        OR h.address ILIKE $${params.length}
      )`);
    }

    const result = await pool.query(
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
         MIN(r.base_price) AS min_price
       FROM hotel h
       LEFT JOIN image thumb
         ON thumb.hotel_id = h.id
        AND thumb.is_thumbnail = true
       LEFT JOIN room r
         ON r.hotel_id = h.id
        AND r.is_active = true
        AND r.deleted_at IS NULL
       WHERE ${where.join(" AND ")}
       GROUP BY h.id, thumb.path
       ORDER BY h.average_rating DESC, h.created_at DESC
       LIMIT 30`,
      params,
    );

    return res.json({
      hotels: result.rows.map(formatHotel),
      total: result.rowCount,
      destination,
    });
  } catch (error) {
    return next(error);
  }
}

async function getHotelById(req, res, next) {
  try {
    const result = await pool.query(
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

    const hotel = result.rows[0];

    if (!hotel) {
      return res.status(404).json({ message: "Không tìm thấy khách sạn." });
    }

    return res.json({
      hotel: {
        ...formatHotel(hotel),
        amenities: hotel.amenities || [],
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
  getHotelById,
  listHotelRooms,
};
