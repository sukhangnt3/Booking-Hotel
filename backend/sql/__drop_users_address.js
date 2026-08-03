require('dotenv').config({ path: 'c:/Users/DELL/Desktop/Booking_Hotel/backend/.env' });
const pool = require('../config/database');

(async () => {
  try {
    await pool.query("ALTER TABLE users DROP COLUMN IF EXISTS address;");
    console.log('address column dropped if existed');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();