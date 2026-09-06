// backend/utils/formatters.js

function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.full_name,
    fullName: user.full_name,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || null,
    dob: user.dob ? new Date(user.dob).toISOString().split("T")[0] : null,
    avatar: user.avatar || null,
    roles: user.roles || [],
    activate: user.activate,
    emailVerified: user.email_verified,
    phoneVerified: user.phone_verified,
    lastLogin: user.last_login,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

function formatHotel(hotel) {
  if (!hotel) return null;
  return {
    id: hotel.id,
    ownerId: hotel.owner_id,
    owner_id: hotel.owner_id,
    name: hotel.name,
    address: hotel.address,
    city: hotel.city,
    latitude: hotel.latitude ? Number(hotel.latitude) : null,
    longitude: hotel.longitude ? Number(hotel.longitude) : null,
    description: hotel.description,
    image: hotel.thumbnail || hotel.image,
    starRating: Number(hotel.star_rating || 0),
    star_rating: Number(hotel.star_rating || 0),
    averageRating: Number(hotel.average_rating || 0),
    average_rating: Number(hotel.average_rating || 0),
    reviewCount: Number(hotel.review_count || 0),
    review_count: Number(hotel.review_count || 0),
    phone: hotel.phone,
    email: hotel.email,
    status: hotel.status,
    rejectionReason: hotel.rejection_reason,
    rejection_reason: hotel.rejection_reason,
    checkinTime: hotel.checkin_time,
    checkin_time: hotel.checkin_time,
    checkoutTime: hotel.checkout_time,
    checkout_time: hotel.checkout_time,
    cancellationDeadlineHours: hotel.cancellation_deadline_hours,
    cancellation_deadline_hours: hotel.cancellation_deadline_hours,
    bankName: hotel.bank_name,
    bank_name: hotel.bank_name,
    bankAccount: hotel.bank_account,
    bank_account: hotel.bank_account,
    bankAccountHolder: hotel.bank_account_holder,
    bank_account_holder: hotel.bank_account_holder,
    taxCode: hotel.tax_code,
    tax_code: hotel.tax_code,
    businessLicenseUrl: hotel.business_license_url,
    business_license_url: hotel.business_license_url,
    commissionRate: Number(hotel.commission_rate || 18),
    commission_rate: Number(hotel.commission_rate || 18),
    thumbnail: hotel.thumbnail,
    minPrice:
      hotel.min_price === null || hotel.min_price === undefined
        ? null
        : Number(hotel.min_price),
    min_price:
      hotel.min_price === null || hotel.min_price === undefined
        ? null
        : Number(hotel.min_price),
    images: hotel.images || [],
    services: hotel.services || [],
    amenities: hotel.amenities || [],
    createdAt: hotel.created_at,
    updatedAt: hotel.updated_at,
  };
}

function formatRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    hotelId: room.hotel_id,
    hotel_id: room.hotel_id,
    name: room.name,
    capacity: Number(room.capacity || 2),
    basePrice: Number(room.base_price || 0),
    base_price: Number(room.base_price || 0),
    description: room.description,
    type: room.type,
    bedType: room.bed_type,
    bed_type: room.bed_type,
    roomArea: room.room_area ? Number(room.room_area) : null,
    room_area: room.room_area ? Number(room.room_area) : null,
    amount: Number(room.amount || 0),
    isActive: room.is_active,
    is_active: room.is_active,
    thumbnail: room.thumbnail,
    amenities: room.amenities || [],
    sellPrice:
      room.sell_price === null || room.sell_price === undefined
        ? null
        : Number(room.sell_price),
    sell_price:
      room.sell_price === null || room.sell_price === undefined
        ? null
        : Number(room.sell_price),
    availableCount:
      room.available_count === null || room.available_count === undefined
        ? null
        : Number(room.available_count),
    available_count:
      room.available_count === null || room.available_count === undefined
        ? null
        : Number(room.available_count),
    createdAt: room.created_at,
    updatedAt: room.updated_at,
  };
}

function formatReview(review) {
  if (!review) return null;
  return {
    id: review.id,
    userId: review.user_id,
    user_id: review.user_id,
    hotelId: review.hotel_id,
    hotel_id: review.hotel_id,
    bookingId: review.booking_id,
    booking_id: review.booking_id,
    point: Number(review.point || 5),
    description: review.description,
    reply: review.reply,
    userName: review.user_name || review.full_name,
    full_name: review.user_name || review.full_name,
    createdAt: review.created_at,
  };
}

function formatPromotion(promotion) {
  if (!promotion) return null;
  return {
    id: promotion.id,
    hotelId: promotion.hotel_id,
    hotel_id: promotion.hotel_id,
    hotelName: promotion.hotel_name,
    hotel_name: promotion.hotel_name,
    code: promotion.code,
    type: promotion.type,
    value: Number(promotion.value || 0),
    maxDiscount: promotion.max_discount ? Number(promotion.max_discount) : null,
    max_discount: promotion.max_discount
      ? Number(promotion.max_discount)
      : null,
    minOrderValue: promotion.min_order_value
      ? Number(promotion.min_order_value)
      : null,
    min_order_value: promotion.min_order_value
      ? Number(promotion.min_order_value)
      : null,
    startDate: promotion.start_date,
    start_date: promotion.start_date,
    endDate: promotion.end_date,
    end_date: promotion.end_date,
    usageLimit: promotion.usage_limit ? Number(promotion.usage_limit) : null,
    usage_limit: promotion.usage_limit ? Number(promotion.usage_limit) : null,
    isActive: promotion.is_active,
    is_active: promotion.is_active,
    createdAt: promotion.created_at,
  };
}

function formatBooking(booking) {
  if (!booking) return null;
  return {
    id: booking.id,
    bookingCode: booking.booking_code,
    booking_code: booking.booking_code,
    userId: booking.user_id,
    user_id: booking.user_id,
    hotelId: booking.hotel_id,
    hotel_id: booking.hotel_id,
    hotelName: booking.hotel_name,
    hotel_name: booking.hotel_name,
    promotionId: booking.promotion_id,
    promotion_id: booking.promotion_id,
    checkinDate: booking.checkin_date,
    checkin_date: booking.checkin_date,
    checkoutDate: booking.checkout_date,
    checkout_date: booking.checkout_date,
    adultTotal: Number(booking.adult_total || 1),
    adult_total: Number(booking.adult_total || 1),
    childrenTotal: Number(booking.children_total || 0),
    children_total: Number(booking.children_total || 0),
    customerName: booking.customer_name,
    customer_name: booking.customer_name,
    guestEmail: booking.guest_email,
    guest_email: booking.guest_email,
    guestPhone: booking.guest_phone,
    guest_phone: booking.guest_phone,
    specialRequire: booking.special_require,
    special_require: booking.special_require,
    status: booking.status,
    paymentStatus: booking.payment_status,
    payment_status: booking.payment_status,
    subtotal: Number(booking.subtotal || 0),
    discount: Number(booking.discount || 0),
    serviceTotal: Number(booking.service_total || 0),
    service_total: Number(booking.service_total || 0),
    totalPrice: Number(booking.total_price || 0),
    total_price: Number(booking.total_price || 0),
    hotelPayout: Number(booking.hotel_payout || 0),
    hotel_payout: Number(booking.hotel_payout || 0),
    cancelReason: booking.cancel_reason,
    cancel_reason: booking.cancel_reason,
    cancelledAt: booking.cancelled_at,
    cancelled_at: booking.cancelled_at,
    confirmedAt: booking.confirmed_at,
    confirmed_at: booking.confirmed_at,
    roomNumber: booking.room_number,
    room_number: booking.room_number,
    createdAt: booking.created_at,
    created_at: booking.created_at,
    updatedAt: booking.updated_at,
    updated_at: booking.updated_at,
  };
}

function formatNotification(notification) {
  if (!notification) return null;
  return {
    id: notification.id,
    title: notification.title,
    content: notification.content,
    type: notification.type,
    link: notification.link,
    readAt: notification.read_at,
    read_at: notification.read_at,
    createdAt: notification.created_at,
    created_at: notification.created_at,
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
