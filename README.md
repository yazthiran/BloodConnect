# BloodConnect — MongoDB version

This is a fresh, ready-to-configure version based on your BloodConnect requirements:
- Donor registration and login
- Hospital registration and login
- JWT authentication with bcrypt password hashing
- Donor search by blood group and city
- Emergency blood requests
- Dashboard counts
- Optional browser geolocation for donor/hospital location

## Requirements
- Node.js (LTS recommended)
- MongoDB Community Server installed and running locally, OR a MongoDB Atlas connection string
- VS Code

## 1. Start MongoDB
If you installed MongoDB Community Server locally, make sure the MongoDB service is running.
Default local connection string:
`mongodb://127.0.0.1:27017/bloodconnect`

If using Atlas, put your Atlas connection string in `backend/.env` as `MONGODB_URI`.
Do not share your `.env` or database password publicly.

## 2. Start backend
Open a terminal in the `backend` folder:
```bash
npm install
```
Copy `.env.example` to `.env` and keep the default URI for local MongoDB, or replace it with your Atlas URI.
Then run:
```bash
npm run dev
```
Backend should print that MongoDB connected and API is running at `http://localhost:5000`.

Test in browser: `http://localhost:5000/`

## 3. Start frontend
Open a second terminal in the `frontend` folder:
```bash
npm install
npm run dev
```
Open the URL Vite prints, normally `http://localhost:5173`.

## Notes
- Register and login as Donor or Hospital separately. The role is stored with the account and checked by protected API routes.
- Geolocation works only after you grant browser location permission. If you deny permission, you can still type a city/location.
- This is a college prototype. Age >= 18 is only a basic age check, not a complete medical eligibility assessment.
- Do not claim SMS alerts, medical verification, production deployment, Redis, or Docker are implemented.
- If local MongoDB does not connect, check that the MongoDB service is running and that `MONGODB_URI` is correct.
