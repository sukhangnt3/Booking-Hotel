const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);

  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, storedPassword) {
  if (typeof storedPassword !== "string") return false;

  const [algorithm, salt, storedKey] = storedPassword.split("$");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;

  const key = await scryptAsync(password, salt, 64);
  const storedBuffer = Buffer.from(storedKey, "hex");

  return storedBuffer.length === key.length
    && crypto.timingSafeEqual(storedBuffer, key);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
