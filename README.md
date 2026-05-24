# Allo Inventory — Take-Home Exercise

A Next.js inventory reservation system with concurrency-safe stock holds.

## Live Demo
> Add your Vercel URL here after deployment

## Local Setup

### 1. Clone the repo
git clone <your-repo-url>
cd allo-inventory

### 2. Install dependencies
npm install

### 3. Set up environment variables
cp .env.example .env

Fill in the following in `.env`:
- `DATABASE_URL` — PostgreSQL connection string (Neon/Supabase)
- `UPSTASH_REDIS_REST_URL` — Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis token
- `CRON_SECRET` — any random secret string

### 4. Run migrations and seed
npx prisma migrate dev
npx prisma db seed

### 5. Start the dev server
npm run dev

Open http://localhost:3000

---

## How Reservation Expiry Works

When a reservation is created, it gets an `expiresAt` timestamp 10 minutes in the future.

**In production (Vercel):** A cron job hits `/api/cron/cleanup` every minute. It finds all
PENDING reservations where `expiresAt < now`, marks them RELEASED, and decrements
the `reserved` count on the stock row so units become available again.

**In development:** The cleanup also runs lazily on every `GET /api/products` and
`POST /api/reservations` request, so expired reservations are released on the next
incoming request.

---

## How Concurrency is Handled

The `POST /api/reservations` endpoint uses a PostgreSQL `SELECT FOR UPDATE` inside a
Prisma transaction. This row-level lock ensures that if two requests arrive simultaneously
for the last unit of a SKU, Postgres serializes them — the second transaction waits,
then sees `reserved >= total` and returns a 409. Exactly one request succeeds.

---

## Idempotency (Bonus)

The `POST /api/reservations` endpoint supports an optional `Idempotency-Key` header.
If a client retries with the same key, the server returns the original response from
Redis without creating a duplicate reservation. Keys are cached for 24 hours.

---

## Trade-offs & What I'd Do Differently

- **Expiry:** Lazy cleanup is simple but means stock isn't released instantly when a
  reservation expires. The Vercel cron brings max lag to ~60 seconds, which is acceptable.
  With more time, I'd use a Redis key with a TTL and a keyspace notification to trigger
  instant cleanup.

- **Idempotency scope:** Currently only the reserve endpoint is idempotent. With more
  time I'd add it to confirm as well.

- **No auth:** There's no user authentication. In production each reservation would be
  tied to a user session.

- **Quantity fixed at 1:** The UI always reserves 1 unit. The API supports any quantity —
  a quantity picker in the UI would be a small addition.