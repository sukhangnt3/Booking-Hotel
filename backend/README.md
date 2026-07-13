# Booking Hotel Backend

Backend API for the Hotel Booking application.

## Tech Stack
- Node.js
- Express 5
- PostgreSQL
- CORS
- dotenv

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create a local `.env` file based on `.env.example`.

3. Run in development:

```powershell
npm run dev
```

4. Run in production:

```powershell
npm start
```

## Main API Routes
- `GET /api/test` - check backend and database connection
- `POST /api/auth/register` - register a new user
- `POST /api/auth/login` - login
- `GET /api/auth/profile` - get current profile
- `GET /api/hotels` - list hotels
- `GET /api/health` is not required because health is available through `/api/test`

## Environment Variables
- `PORT`
- `FRONTEND_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`

## Push only backend to GitHub
If you want to publish backend as a separate repository:

```powershell
cd backend
git init
git add .
git commit -m "Initial backend"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-backend-repo>.git
git push -u origin main
```

If this folder is already part of another repo, create a new empty GitHub repository first, then add it as the remote above.
