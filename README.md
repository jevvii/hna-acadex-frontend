# HNA Acadex — React Native App

React Native client for HNA Acadex, now wired to a Django backend.

## Environment

Create `.env` from `.env.example` and set:

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

Use these values depending on where the app runs:

- Android emulator: `http://10.0.2.2:8000/api`
- iOS simulator: `http://127.0.0.1:8000/api`
- Physical device: `http://<YOUR_LAN_IP>:8000/api`

The API client automatically rewrites `localhost`/`127.0.0.1` to `10.0.2.2` on Android emulator to avoid POST/network errors.

## Run

```bash
npm install
npm start
```

## Backend Requirement

Run the Django backend in `../hna-acadex-backend` first.

- Admin site: `http://127.0.0.1:8000/admin/`
- API root: `http://127.0.0.1:8000/api/`

Admins should create student/teacher accounts from Django Admin or from the app Admin Dashboard.
