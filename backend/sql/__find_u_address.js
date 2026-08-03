require('dotenv').config({ path: 'c:/Users/DELL/Desktop/Booking_Hotel/backend/.env' });
const pool = require('../config/database');

(async () => {
  try {
    const queries = [
      `SELECT viewname, definition FROM pg_views WHERE definition ILIKE '%u.address%';`,
      `SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%u.address%';`,
      `SELECT relname, pg_get_viewdef(oid) as def FROM pg_class WHERE relkind = 'v' AND pg_get_viewdef(oid) ILIKE '%u.address%';`,
      `SELECT routine_name, routine_definition FROM information_schema.routines WHERE routine_definition ILIKE '%u.address%';`,
    ];

    for (const q of queries) {
      try {
        const r = await pool.query(q);
        console.log('QUERY:', q);
        console.log('ROWS:', r.rowCount);
        if (r.rowCount > 0) console.log(r.rows);
      } catch (innerErr) {
        console.error('Failed query:', q);
        console.error(innerErr.message || innerErr);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();