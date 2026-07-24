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
    image: hotel.thumbnail,
    starRating: hotel.star_rating,
    star_rating: hotel.star_rating,
    averageRating: Number(hotel.average_rating || 0),
    average_rating: Number(hotel.average_rating || 0),
    reviewCount: hotel.review_count,
    review_count: hotel.review_count,
    phone: hotel.phone,
    email: hotel.email,
    thumbnail: hotel.thumbnail,
    minPrice: hotel.min_price === null ? null : Number(hotel.min_price),
    min_price: hotel.min_price === null ? null : Number(hotel.min_price),
  };
}

function formatRoom(room) {
  return {
    id: room.id,
    hotelId: room.hotel_id,
    name: room.name,
    capacity: room.capacity,
    basePrice: Number(room.base_price || 0),
    description: room.description,
    type: room.type,
    bedType: room.bed_type,
    roomArea: room.room_area,
    amount: room.amount,
    isActive: room.is_active,
    thumbnail: room.thumbnail,
    amenities: room.amenities || [],
  };
}

function formatReview(review) {
  return {
    id: review.id,
    userId: review.user_id,
    hotelId: review.hotel_id,
    bookingId: review.booking_id,
    description: review.description,
    point: review.point,
    reply: review.reply,
    userName: review.user_name,
    createdAt: review.created_at,
  };
}

function formatPromotion(promotion) {
  return {
    id: promotion.id,
    hotelId: promotion.hotel_id,
    hotelName: promotion.hotel_name,
    code: promotion.code,
    type: promotion.type,
    value: promotion.value,
    maxDiscount: promotion.max_discount,
    minOrderValue: promotion.min_order_value,
    startDate: promotion.start_date,
    endDate: promotion.end_date,
    usageLimit: promotion.usage_limit,
    isActive: promotion.is_active,
  };
}

function formatBooking(booking) {
  return {
    id: booking.id,
    bookingCode: booking.booking_code,
    userId: booking.user_id,
    hotelId: booking.hotel_id,
    hotelName: booking.hotel_name,
    checkinDate: booking.checkin_date,
    checkoutDate: booking.checkout_date,
    adultTotal: booking.adult_total,
    childrenTotal: booking.children_total,
    customerName: booking.customer_name,
    guestEmail: booking.guest_email,
    guestPhone: booking.guest_phone,
    status: booking.status,
    paymentStatus: booking.payment_status,
    subtotal: booking.subtotal,
    discount: booking.discount,
    tax: booking.tax,
    serviceTotal: booking.service_total,
    totalPrice: booking.total_price,
    specialRequire: booking.special_require,
    createdAt: booking.created_at,
  };
}

function formatNotification(notification) {
  return {
    id: notification.id,
    title: notification.title,
    content: notification.content,
    type: notification.type,
    link: notification.link,
    readAt: notification.read_at,
    createdAt: notification.created_at,
  };
}

module.exports = {
  formatUser,
  formatHotel,
  formatRoom,
  formatReview,
  formatPromotion,
  formatBooking,
  formatNotification,
};
