require('dotenv').config({ path: 'c:/Users/DELL/Desktop/Booking_Hotel/backend/.env' });
const pool = require('../config/database');

(async () => {
  try {
    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
    console.log('users columns:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();