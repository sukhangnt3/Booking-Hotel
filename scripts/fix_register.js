const fs = require('fs');
const p = 'c:/Users/DELL/Desktop/Booking_Hotel/frontend/src/components/auth/RegisterForm/index.jsx';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split(/\r?\n/);
// Remove orphaned body: lines 273-294 (1-indexed), so 0-indexed: 272-293
const newLines = [
  ...lines.slice(0, 272),
  '',
  ...lines.slice(294),
];
fs.writeFileSync(p, newLines.join('\n'));
console.log('Fixed. Old lines:', lines.length, '-> New lines:', newLines.length);
