const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const pool = require('./config/database');

(async () => {
  try {
    const email = 'admin@hotel.com';
    const password = 'admin123';
    const hashed = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const res = await pool.query(
      `INSERT INTO users (id, full_name, email, password, activate)
       VALUES ($1, 'Admin', $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password RETURNING id`,
      [userId, email, hashed]
    );
    const uid = res.rows[0].id;

    const roleRes = await pool.query(
      `INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    const roleId = roleRes.rows[0].id;

    await pool.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [uid, roleId]
    );

    console.log('Admin ready:', email, '/', password);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
