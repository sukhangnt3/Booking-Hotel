const fs = require('fs');
const p = 'c:/Users/DELL/Desktop/Booking_Hotel/frontend/src/components/auth/RegisterForm/index.jsx';
let s = fs.readFileSync(p, 'utf8');
// Fix: add /api prefix to partner register endpoint
const old = 'await apiClient.post("/partner/register", payload);';
const replacement = 'await apiClient.post("/api/partner/register", payload);';
if (s.includes(old)) {
  s = s.replace(old, replacement);
  fs.writeFileSync(p, s);
  console.log('FIXED: added /api prefix');
} else {
  console.log('ALREADY_FIXED or NOT_FOUND. Content around line 251:');
  const lines = s.split(/\r?\n/);
  for (let i = 248; i < 255; i++) console.log((i+1) + ': ' + lines[i]);
}
