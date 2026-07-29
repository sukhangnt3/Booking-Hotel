-- Google-only auth cleanup for Booking_Hotel
--
-- Backend now uses Google login only. Keep the identity tables below because
-- Google login still maps users to roles and issues backend tokens.
--
-- Apply after taking a backup and only if you are ready to retire legacy
-- email/password authentication permanently.

BEGIN;

-- Keep the existing NOT NULL password constraint if you want a conservative
-- rollout. Google-created accounts will still receive a generated placeholder
-- password hash from the backend, so the schema does not need to change.

-- Optional cleanup once you are sure email/password login is no longer needed:
-- ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Keep these tables; they are still required for auth/authorization.
-- users, roles, user_roles

COMMIT;