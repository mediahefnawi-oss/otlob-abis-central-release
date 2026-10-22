# Otlob Abis Central API (PostgreSQL, no Firestore)

This service is a deployable backend foundation for the Otlob Abis app. It stores shared data in PostgreSQL and provides server-side authentication, role checks, rate-limited login, product endpoints, order endpoints, order messaging, and owner approval endpoints.

## Important integration note
The existing Expo app still reads and writes its main application state through `AsyncStorage` in `lib/store.ts`. Adding this backend does **not** automatically move the current app screens to the server. The app's store/actions must be migrated to call these endpoints before production users can rely on cross-device central data. Do not describe this scaffold as a completed end-to-end integration until that migration and testing are finished.

## Deploy
1. Create a managed PostgreSQL database (for example Neon or another PostgreSQL provider). Do not use SQLite on an ephemeral server filesystem.
2. Deploy this `backend` directory as a Node.js web service on a persistent Node hosting platform.
3. Set environment variables using `.env.example` as a guide: `DATABASE_URL`, a random `JWT_SECRET` of at least 32 characters, `OWNER_USERNAME`, `OWNER_PASSWORD`, `OWNER_PHONE`, `CORS_ORIGINS`, and `NODE_ENV=production`.
4. Set `CORS_ORIGINS` to the exact deployed web origin(s), comma-separated. Avoid wildcard origins in production.
5. Deploy and check `https://YOUR-API-DOMAIN/api/health`.
6. Never commit `.env`, database credentials, JWT secrets, or owner passwords.

## Local run
```bash
cp .env.example .env
# Edit .env with real development values
npm install
npm start
```

The schema is applied at startup. The first admin record is created from the environment variables if there is no admin with `OWNER_PHONE`. Changing `OWNER_PASSWORD` after initial creation does not automatically rotate an existing account password; implement a dedicated password-rotation workflow before operational use.

## Current routes
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/providers`
- `GET /api/products`
- `POST /api/products` (provider/admin)
- `PATCH /api/products/:id` (owner/admin)
- `DELETE /api/products/:id` (owner/admin)
- `POST /api/orders` (customer)
- `GET /api/orders` (role-scoped)
- `PATCH /api/orders/:id/status` (provider/courier/admin)
- `GET /api/orders/:id/messages`
- `POST /api/orders/:id/messages`
- `GET /api/admin/providers/pending` (admin)
- `PATCH /api/admin/providers/:id/decision` (admin)

Before production: migrate all existing store operations, add automated tests, configure HTTPS and database backups, and rotate all sample secrets.
