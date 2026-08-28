const bcrypt = require('c:/Users/DELL/Desktop/Booking_Hotel/backend/node_modules/bcryptjs');
const { Pool } = require('c:/Users/DELL/Desktop/Booking_Hotel/backend/node_modules/pg');
const crypto = require('crypto');
require('dotenv').config({ path: 'c:/Users/DELL/Desktop/Booking_Hotel/backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'hotel_booking',
});

(async () => {
  try {
    const email = 'admin@hotel.com';
    const password = 'admin123';
    const hashed = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Upsert user
    await pool.query(
      `INSERT INTO users (id, full_name, email, password, activate)
       VALUES ($1, 'Admin', $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password RETURNING id`,
      [userId, email, hashed]
    );
    const res = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const uid = res.rows[0].id;
    console.log('User ID:', uid);

    // Upsert role admin
    const roleRes = await pool.query(
      `INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const roleId = roleRes.rows[0].id;

    // Insert user_roles
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [uid, roleId]
    );

    console.log('Admin created/updated:', email, '/', password);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();
