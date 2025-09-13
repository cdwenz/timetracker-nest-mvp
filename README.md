# TimeTracker MVP API (NestJS + Prisma + PostgreSQL)

Endpoints aligned to your Flutter services:

- `POST /api/auth/register` → accepts `{ name, email, password, role? }`. Returns the created user (201).
- `POST /api/auth/login` → accepts `{ email, password }`. Returns `{ user, access_token }` (200).
- `POST /api/time-tracker` → **JWT required**. Body (snake_case) `{ supported_person, supported_country, working_language, start_date, end_date }`. Returns created entry (201).
- `GET /api/time-tracker` → **JWT required**. Returns your own time entries.

## Quick start

```bash
# 1) Start DB
docker compose up -d

# 2) Install deps
pnpm i   # or npm i / yarn

# 3) Configure env
cp .env.example .env

# 4) Init DB
npx prisma migrate dev --name init

# 5) Run dev server on port 8000
npm run start:dev
```

## Notes

- Global prefix is `/api` and CORS is enabled.
- DTOs accept snake_case fields to match your Flutter code.
- JWT expires in 7 days by default. Set `JWT_SECRET` in `.env`.
- Database URL defaults to local Postgres on port 5432.
- If you prefer **MySQL**, change `provider` in `schema.prisma`, adjust `DATABASE_URL`, and re-run migrations.
