function formatUser(user) {
  return {
    id: user.id,
    name: user.full_name,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    roles: user.roles || [],
    activate: user.activate,
    createdAt: user.created_at,
  };
}

function formatHotel(hotel) {
  return {
    id: hotel.id,
    name: hotel.name,
    address: hotel.address,
    city: hotel.city,
    description: hotel.description,
    starRating: hotel.star_rating,
    averageRating: Number(hotel.average_rating || 0),
    reviewCount: hotel.review_count,
    phone: hotel.phone,
    email: hotel.email,
    thumbnail: hotel.thumbnail,
    minPrice: hotel.min_price === null ? null : Number(hotel.min_price),
  };
}

module.exports = {
  formatUser,
  formatHotel,
};
