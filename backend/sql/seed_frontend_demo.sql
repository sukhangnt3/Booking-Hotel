BEGIN;

-- Demo identity records used by hotel ownership and sample booking data.
INSERT INTO users (
  id,
  full_name,
  email,
  password,
  phone,
  dob,
  avatar,
  email_verified,
  phone_verified,
  activate,
  last_login,
  created_at,
  updated_at
)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Demo Owner',
    'owner@booking-demo.test',
    'scrypt$seed$owner',
    '0900000001',
    NULL,
    NULL,
    true,
    false,
    true,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Demo Customer',
    'guest@booking-demo.test',
    'scrypt$seed$guest',
    '0900000002',
    NULL,
    NULL,
    true,
    false,
    true,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password = EXCLUDED.password,
  phone = EXCLUDED.phone,
  email_verified = EXCLUDED.email_verified,
  phone_verified = EXCLUDED.phone_verified,
  activate = EXCLUDED.activate,
  updated_at = NOW();

INSERT INTO roles (name)
VALUES ('customer')
ON CONFLICT (name) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '10000000-0000-0000-0000-000000000002', r.id
FROM roles r
WHERE r.name = 'customer'
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles ur
    WHERE ur.user_id = '10000000-0000-0000-0000-000000000002'
      AND ur.role_id = r.id
  );

INSERT INTO amenity (id, name, type, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'WiFi miễn phí', 'hotel', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002', 'Hồ bơi', 'hotel', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000003', 'Bữa sáng', 'hotel', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000004', 'Bãi đỗ xe', 'hotel', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000005', 'Điều hòa', 'room', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000006', 'TV màn hình phẳng', 'room', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000007', 'Minibar', 'room', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000008', 'Ban công', 'room', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  updated_at = NOW();

INSERT INTO hotel (
  id,
  owner_id,
  name,
  address,
  city,
  latitude,
  longitude,
  description,
  star_rating,
  email,
  phone,
  status,
  average_rating,
  review_count,
  contact_name,
  contact_phone,
  created_by,
  updated_by,
  deleted_at,
  created_at,
  updated_at
)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Sunrise Bay Hotel',
    '01 Vo Nguyen Giap',
    'Da Nang',
    16.0678,
    108.2208,
    'Khách sạn ven biển phù hợp cho nghỉ dưỡng và công tác.',
    5,
    'hello@sunrisebay.test',
    '0236123456',
    'approved',
    9.2,
    428,
    'Demo Owner',
    '0900000001',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Lotus Riverside Resort',
    '88 Tran Phu',
    'Nha Trang',
    12.2388,
    109.1967,
    'Khu nghỉ dưỡng trung tâm thành phố với hồ bơi và spa.',
    4,
    'hello@lotusriverside.test',
    '0258123456',
    'approved',
    8.9,
    315,
    'Demo Owner',
    '0900000001',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Heritage House Hanoi',
    '12 Hang Bong',
    'Ha Noi',
    21.0285,
    105.8542,
    'Chỗ nghỉ kiểu boutique gần khu phố cổ, phù hợp khách du lịch thành phố.',
    4,
    'hello@heritagehouse.test',
    '0243123456',
    'approved',
    8.7,
    264,
    'Demo Owner',
    '0900000001',
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  description = EXCLUDED.description,
  star_rating = EXCLUDED.star_rating,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  average_rating = EXCLUDED.average_rating,
  review_count = EXCLUDED.review_count,
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  created_by = EXCLUDED.created_by,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

INSERT INTO hotel_amenity (hotel_id, amenity_id)
SELECT * FROM (VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid),
  ('40000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000003'::uuid),
  ('40000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000004'::uuid),
  ('40000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('40000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000003'::uuid)
) AS src(hotel_id, amenity_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM hotel_amenity ha
  WHERE ha.hotel_id = src.hotel_id
    AND ha.amenity_id = src.amenity_id
);

INSERT INTO policy (
  id,
  hotel_id,
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
  deposit_value,
  created_by,
  updated_by,
  created_at,
  updated_at
)
VALUES
  (
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    0,
    18,
    true,
    true,
    true,
    24,
    '14:00',
    '23:00',
    '06:00',
    '12:00',
    false,
    'percentage',
    0,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NOW(),
    NOW()
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    0,
    18,
    true,
    false,
    true,
    12,
    '14:00',
    '22:00',
    '06:00',
    '12:00',
    false,
    'percentage',
    0,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NOW(),
    NOW()
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000003',
    0,
    18,
    true,
    true,
    false,
    0,
    '14:00',
    '22:00',
    '06:00',
    '12:00',
    true,
    'fixed_amount',
    500000,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  hotel_id = EXCLUDED.hotel_id,
  limited_age = EXCLUDED.limited_age,
  min_adult_age = EXCLUDED.min_adult_age,
  children_allowed = EXCLUDED.children_allowed,
  animal_allowed = EXCLUDED.animal_allowed,
  free_cancellation = EXCLUDED.free_cancellation,
  cancellation_deadline_hours = EXCLUDED.cancellation_deadline_hours,
  start_checkin_time = EXCLUDED.start_checkin_time,
  end_checkin_time = EXCLUDED.end_checkin_time,
  start_checkout_time = EXCLUDED.start_checkout_time,
  end_checkout_time = EXCLUDED.end_checkout_time,
  require_deposit = EXCLUDED.require_deposit,
  deposit_type = EXCLUDED.deposit_type,
  deposit_value = EXCLUDED.deposit_value,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

INSERT INTO hotel_service (
  id,
  hotel_id,
  name,
  base_price,
  description,
  is_active,
  created_at,
  updated_at
)
VALUES
  ('42000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Airport transfer', 350000, 'Đưa đón sân bay 1 chiều.', true, NOW(), NOW()),
  ('42000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Buffet breakfast', 180000, 'Bữa sáng tự chọn mỗi ngày.', true, NOW(), NOW()),
  ('42000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'Spa package', 650000, 'Gói spa thư giãn cho 2 người.', true, NOW(), NOW()),
  ('42000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 'Late check-out', 300000, 'Trả phòng muộn đến 15:00.', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  hotel_id = EXCLUDED.hotel_id,
  name = EXCLUDED.name,
  base_price = EXCLUDED.base_price,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO room (
  id,
  hotel_id,
  name,
  capacity,
  base_price,
  description,
  type,
  bed_type,
  room_area,
  amount,
  is_active,
  created_by,
  updated_by,
  deleted_at,
  created_at,
  updated_at
)
VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'Deluxe Ocean View',
    2,
    1600000,
    'Phòng cao cấp nhìn ra biển với ban công riêng.',
    'Deluxe',
    '1 giường king',
    38,
    10,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'Family Suite',
    4,
    2600000,
    'Suite rộng dành cho gia đình, có khu sinh hoạt riêng.',
    'Suite',
    '2 giường đôi',
    56,
    6,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000002',
    'Superior City View',
    2,
    1200000,
    'Phòng sáng, hướng phố, phù hợp khách công tác.',
    'Superior',
    '1 giường queen',
    30,
    12,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '40000000-0000-0000-0000-000000000002',
    'Executive Suite',
    3,
    2200000,
    'Suite riêng tư với không gian làm việc và thư giãn.',
    'Suite',
    '1 giường king',
    45,
    4,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    '40000000-0000-0000-0000-000000000003',
    'Classic Double',
    2,
    950000,
    'Phòng cổ điển ấm cúng, gần phố cổ.',
    'Classic',
    '1 giường đôi',
    24,
    14,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000006',
    '40000000-0000-0000-0000-000000000003',
    'Balcony Suite',
    3,
    1750000,
    'Phòng suite có ban công riêng và khu vực đọc sách.',
    'Suite',
    '1 giường king',
    34,
    7,
    true,
    '10000000-0000-0000-0000-000000000001',
    NULL,
    NULL,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  hotel_id = EXCLUDED.hotel_id,
  name = EXCLUDED.name,
  capacity = EXCLUDED.capacity,
  base_price = EXCLUDED.base_price,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  bed_type = EXCLUDED.bed_type,
  room_area = EXCLUDED.room_area,
  amount = EXCLUDED.amount,
  is_active = EXCLUDED.is_active,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

INSERT INTO room_amenity (room_id, amenity_id)
SELECT * FROM (VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('50000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000005'::uuid),
  ('50000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000006'::uuid),
  ('50000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000005'::uuid),
  ('50000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000006'::uuid),
  ('50000000-0000-0000-0000-000000000002'::uuid, '30000000-0000-0000-0000-000000000008'::uuid),
  ('50000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('50000000-0000-0000-0000-000000000003'::uuid, '30000000-0000-0000-0000-000000000006'::uuid),
  ('50000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000002'::uuid),
  ('50000000-0000-0000-0000-000000000004'::uuid, '30000000-0000-0000-0000-000000000007'::uuid),
  ('50000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('50000000-0000-0000-0000-000000000005'::uuid, '30000000-0000-0000-0000-000000000005'::uuid),
  ('50000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000001'::uuid),
  ('50000000-0000-0000-0000-000000000006'::uuid, '30000000-0000-0000-0000-000000000008'::uuid)
) AS src(room_id, amenity_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM room_amenity ra
  WHERE ra.room_id = src.room_id
    AND ra.amenity_id = src.amenity_id
);

INSERT INTO image (
  id,
  path,
  public_id,
  room_id,
  hotel_id,
  alt_text,
  is_thumbnail,
  display_order,
  created_at
)
VALUES
  ('80000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1501117716987-c8e1ecb210e9?auto=format&fit=crop&w=1200&q=80', NULL, NULL, '40000000-0000-0000-0000-000000000001', 'Sunrise Bay Hotel exterior', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80', NULL, NULL, '40000000-0000-0000-0000-000000000001', 'Sunrise Bay lobby', false, 2, NOW()),
  ('80000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', NULL, NULL, '40000000-0000-0000-0000-000000000002', 'Lotus Riverside Resort exterior', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80', NULL, NULL, '40000000-0000-0000-0000-000000000003', 'Heritage House Hanoi exterior', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000001', NULL, 'Deluxe Ocean View room', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1560067174-8943bd77b833?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000002', NULL, 'Family Suite room', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000003', NULL, 'Superior City View room', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000004', NULL, 'Executive Suite room', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000005', NULL, 'Classic Double room', true, 1, NOW()),
  ('80000000-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80', NULL, '50000000-0000-0000-0000-000000000006', NULL, 'Balcony Suite room', true, 1, NOW())
ON CONFLICT (id) DO UPDATE SET
  path = EXCLUDED.path,
  room_id = EXCLUDED.room_id,
  hotel_id = EXCLUDED.hotel_id,
  alt_text = EXCLUDED.alt_text,
  is_thumbnail = EXCLUDED.is_thumbnail,
  display_order = EXCLUDED.display_order;

INSERT INTO room_inventory (
  id,
  room_id,
  inventory_date,
  available_count,
  sold_count,
  locked_count,
  base_price,
  sell_price,
  status,
  created_at,
  updated_at
)
SELECT
  md5(r.id::text || gs::text)::uuid,
  r.id,
  gs::date,
  r.amount,
  0,
  0,
  r.base_price,
  CASE
    WHEN r.hotel_id = '40000000-0000-0000-0000-000000000001' THEN r.base_price + 150000
    WHEN r.hotel_id = '40000000-0000-0000-0000-000000000002' THEN r.base_price + 100000
    ELSE r.base_price + 80000
  END,
  'active',
  NOW(),
  NOW()
FROM room r
CROSS JOIN generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', INTERVAL '1 day') AS gs
WHERE r.deleted_at IS NULL
ON CONFLICT (id) DO UPDATE SET
  available_count = EXCLUDED.available_count,
  sold_count = EXCLUDED.sold_count,
  locked_count = EXCLUDED.locked_count,
  base_price = EXCLUDED.base_price,
  sell_price = EXCLUDED.sell_price,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO booking (
  id,
  booking_code,
  user_id,
  hotel_id,
  promotion_id,
  checkin_date,
  checkout_date,
  planned_checkin_time,
  planned_checkout_time,
  adult_total,
  children_total,
  customer_name,
  guest_email,
  guest_phone,
  cancel_reason,
  cancelled_at,
  status,
  payment_status,
  special_require,
  currency,
  source,
  subtotal,
  discount,
  tax,
  service_total,
  total_price,
  commission_rate,
  commission_amount,
  hotel_payout,
  expired_at,
  confirmed_at,
  checked_in_at,
  checked_out_at,
  updated_by,
  created_at,
  updated_at
)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'BK-DEMO-0001',
    '10000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    NULL,
    CURRENT_DATE + 5,
    CURRENT_DATE + 8,
    '14:00',
    '12:00',
    2,
    0,
    'Demo Customer',
    'guest@booking-demo.test',
    '0900000002',
    NULL,
    NULL,
    'confirmed',
    'unpaid',
    'Ưu tiên phòng view biển',
    'VND',
    'web',
    4800000,
    0,
    0,
    0,
    4800000,
    NULL,
    0,
    4800000,
    NULL,
    NOW(),
    NULL,
    NULL,
    '10000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  booking_code = EXCLUDED.booking_code,
  user_id = EXCLUDED.user_id,
  hotel_id = EXCLUDED.hotel_id,
  checkin_date = EXCLUDED.checkin_date,
  checkout_date = EXCLUDED.checkout_date,
  planned_checkin_time = EXCLUDED.planned_checkin_time,
  planned_checkout_time = EXCLUDED.planned_checkout_time,
  adult_total = EXCLUDED.adult_total,
  children_total = EXCLUDED.children_total,
  customer_name = EXCLUDED.customer_name,
  guest_email = EXCLUDED.guest_email,
  guest_phone = EXCLUDED.guest_phone,
  status = EXCLUDED.status,
  payment_status = EXCLUDED.payment_status,
  special_require = EXCLUDED.special_require,
  currency = EXCLUDED.currency,
  source = EXCLUDED.source,
  subtotal = EXCLUDED.subtotal,
  discount = EXCLUDED.discount,
  tax = EXCLUDED.tax,
  service_total = EXCLUDED.service_total,
  total_price = EXCLUDED.total_price,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

INSERT INTO booking_room (
  id,
  booking_id,
  room_id,
  sub_index,
  room_name,
  room_type,
  capacity,
  book_date,
  quantity,
  price,
  base_price,
  adult_amount,
  children_amount,
  created_at
)
VALUES
  (
    '61000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    1,
    'Deluxe Ocean View',
    'Deluxe',
    2,
    CURRENT_DATE + 5,
    1,
    1750000,
    1750000,
    2,
    0,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  booking_id = EXCLUDED.booking_id,
  room_id = EXCLUDED.room_id,
  sub_index = EXCLUDED.sub_index,
  room_name = EXCLUDED.room_name,
  room_type = EXCLUDED.room_type,
  capacity = EXCLUDED.capacity,
  book_date = EXCLUDED.book_date,
  quantity = EXCLUDED.quantity,
  price = EXCLUDED.price,
  base_price = EXCLUDED.base_price,
  adult_amount = EXCLUDED.adult_amount,
  children_amount = EXCLUDED.children_amount;

INSERT INTO notification (
  id,
  user_id,
  title,
  content,
  type,
  link,
  read_at,
  created_at
)
VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'Đặt phòng thành công',
    'Mã đặt phòng demo là BK-DEMO-0001.',
    'booking',
    '/bookings/60000000-0000-0000-0000-000000000001',
    NULL,
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  type = EXCLUDED.type,
  link = EXCLUDED.link,
  read_at = EXCLUDED.read_at,
  created_at = EXCLUDED.created_at;

COMMIT;