// scripts/generate-version.js
import fs from "fs";
import path from "path";

const publicDir = path.resolve("public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const versionData = {
  version: Date.now(), // Thời gian build mới nhất
  buildTime: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(publicDir, "version.json"),
  JSON.stringify(versionData, null, 2),
);

console.log("✓ Đã sinh version.json mới:", versionData.version);
