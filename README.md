# Pastebin

A production-oriented Pastebin-like web application. Users can create text pastes, share them via unguessable URLs, and optionally limit lifetime (TTL) and/or view count. Pastes become unavailable when they expire or exhaust their view limit.

The backend APIs and database behavior are the primary evaluation surface. The UI is fully functional but intentionally minimal.

---

## Features

- Create pastes with required non-empty text content
- Cryptographically secure, URL-safe paste IDs (12 characters)
- Shareable URLs generated from `APP_URL` / `NEXT_PUBLIC_APP_URL`
- Optional TTL (seconds until expiration)
- Optional maximum view count
- Atomic, concurrency-safe view consumption in PostgreSQL
- Expiration evaluation with deterministic test-time override (`TEST_MODE` + `x-test-now-ms`)
- Clean responsive UI for creating and viewing pastes
- Comprehensive Vitest coverage for API and core logic

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS 4 |
| API | Next.js Route Handlers |
| Database | PostgreSQL (Neon in production) |
| ORM | Prisma 6 |
| Validation | Zod 4 |
| Tests | Vitest 3 |
| Deploy | Vercel |

---

## Architecture

```
app/
  page.tsx                 # Create paste UI
  p/[id]/page.tsx         # View paste (Server Component)
  api/pastes/route.ts      # POST /api/pastes
  api/pastes/[id]/route.ts# GET /api/pastes/:id
components/                # UI building blocks
lib/
  prisma.ts                # Singleton Prisma client
  paste-service.ts         # Create/retrieve business logic
  validation.ts            # Zod schemas
  time.ts                  # Centralized time + TEST_MODE
  id.ts                    # Secure ID generation
  api-response.ts          # Consistent JSON responses
  app-url.ts               # Shareable URL builder
prisma/
  schema.prisma
  migrations/
tests/
  api/                     # Route-handler integration tests
  unit/                    # Pure unit tests
```

Business logic lives in `lib/paste-service.ts`. Route handlers validate input, resolve time, call the service, and map errors to HTTP responses. The paste viewing page uses the same service so view-count enforcement cannot be bypassed by the UI.

---

## Database schema

```prisma
model Paste {
  id        String    @id @db.VarChar(16)
  content   String    @db.Text
  createdAt DateTime  @default(now()) @map("created_at")
  expiresAt DateTime? @map("expires_at")
  maxViews  Int?      @map("max_views")
  views     Int       @default(0)

  @@index([expiresAt])
  @@map("pastes")
}
```

- Primary key is the public paste ID (not a sequential integer).
- `expires_at` index supports optional cleanup queries.
- Expired rows may remain in the database; retrieval still returns 404.

---

## API endpoints

### `POST /api/pastes`

Create a paste.

**Request**

```json
{
  "content": "Hello, world!",
  "ttl": 3600,
  "max_views": 5
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `content` | yes | non-empty string after trimming whitespace check; max 1,048,576 chars |
| `ttl` | no | positive integer (seconds) |
| `max_views` | no | positive integer |

**Success — `201`**

```json
{
  "id": "a8Kp2xQm9Ld1",
  "url": "https://your-domain.com/p/a8Kp2xQm9Ld1",
  "expires_at": "2026-11-27T12:00:00.000Z",
  "max_views": 5
}
```

`expires_at` / `max_views` are `null` when unlimited.

**Errors**

| Status | When |
| --- | --- |
| 400 | invalid JSON, empty content, invalid ttl/max_views |
| 405 | unsupported method |
| 500 | unexpected server/database failure |

### `GET /api/pastes/:id`

Retrieve a paste and consume exactly one view on success.

**Success — `200`**

```json
{
  "id": "a8Kp2xQm9Ld1",
  "content": "Hello, world!",
  "created_at": "2026-11-26T10:00:00.000Z",
  "expires_at": "2026-11-26T11:00:00.000Z",
  "views": 2,
  "max_views": 5,
  "remaining_views": 3
}
```

When unlimited:

```json
{
  "expires_at": null,
  "max_views": null,
  "remaining_views": null
}
```

**Errors**

| Status | When |
| --- | --- |
| 400 | invalid id format / invalid test-time header |
| 404 | missing, expired, or view limit exhausted |
| 405 | unsupported method |
| 500 | unexpected failure |

Failed retrievals never increment `views`.

### Example curl commands

```bash
curl -X POST http://localhost:3000/api/pastes \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World","ttl":3600,"max_views":5}'
```

```bash
curl http://localhost:3000/api/pastes/<PASTE_ID>
```

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `APP_URL` | recommended | Public origin for shareable links |
| `NEXT_PUBLIC_APP_URL` | optional | Fallback public origin |
| `TEST_MODE` | no | Set `true` only for automated tests |
| `VERCEL_URL` | auto | Used as last-resort URL on Vercel |

Copy `.env.example` to `.env` for local development.

---

## Local installation

### Prerequisites

- Node.js 20+ (22 recommended)
- PostgreSQL 14+ (local, Docker, or Neon)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Example local Docker database:

```bash
docker run -d --name pastebin-postgres \
  -e POSTGRES_USER=pastebin \
  -e POSTGRES_PASSWORD=pastebin \
  -e POSTGRES_DB=pastebin \
  -p 5432:5432 \
  postgres:16-alpine
```

`.env`:

```env
DATABASE_URL="postgresql://pastebin:pastebin@localhost:5432/pastebin?schema=public"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TEST_MODE="false"
```

### 3. Run migrations

```bash
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful commands

```bash
npm run typecheck
npm run lint
npm run build
npm start
npx prisma studio
```

---

## Testing

Tests use an isolated PostgreSQL database configured in `.env.test`.

```env
DATABASE_URL="postgresql://pastebin:pastebin@localhost:5432/pastebin_test?schema=public"
APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TEST_MODE="true"
```

Create and migrate the test database once:

```bash
docker exec -it pastebin-postgres \
  psql -U pastebin -d postgres -c "CREATE DATABASE pastebin_test;"

DATABASE_URL="postgresql://pastebin:pastebin@localhost:5432/pastebin_test?schema=public" \
  npx prisma migrate deploy
```

Run tests:

```bash
npm test
```

Coverage includes:

- paste creation validation and persistence
- retrieval + view increment
- expiration boundaries via `x-test-now-ms`
- view-limit exhaustion (`max_views = 1` and `5`)
- concurrent retrieval races
- TEST_MODE header ignore behavior when disabled

---

## Test-time behavior

When `TEST_MODE=true`:

- Request header `x-test-now-ms` may supply a Unix timestamp in milliseconds
- That value is used for paste creation (`expires_at = now + ttl`) and expiration checks
- If the header is absent, wall-clock time is used
- Invalid header values return HTTP 400

When `TEST_MODE` is not `true`:

- `x-test-now-ms` is ignored completely
- Clients cannot manipulate expiration evaluation

All expiration logic goes through `lib/time.ts` → `getNow()`.

---

## Concurrency-safe view counting

Retrieval does **not** use a read-then-write pattern.

It uses a single atomic SQL statement:

```sql
UPDATE pastes
SET views = views + 1
WHERE id = $id
  AND (expires_at IS NULL OR expires_at > $now)
  AND (max_views IS NULL OR views < max_views)
RETURNING ...
```

PostgreSQL row-level locking ensures concurrent updates serialize on the same row. Only requests that still satisfy the `WHERE` clause increment `views` and receive content. If zero rows are returned, the API responds with `404` and no view is consumed.

This guarantees that a paste with `max_views = N` can succeed at most `N` times, even under parallel load.

---

## Expiration handling

A paste is unavailable when either:

1. `now >= expires_at`, or
2. `views >= max_views`

Both checks are applied in the atomic `UPDATE` above. Whichever condition is hit first wins. Physical deletion is optional (`cleanupExpiredPastes` exists for housekeeping) and is not required for correctness.

---

## Neon setup

1. Create a free project at [https://neon.tech](https://neon.tech)
2. Create a database (for example `pastebin`)
3. Copy the **pooled** connection string (recommended for serverless) from the Neon dashboard
4. Set it as `DATABASE_URL` in Vercel / `.env`

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/pastebin?sslmode=require"
```

For Prisma migrate on Neon, you may use the direct (non-pooled) URL locally:

```bash
DATABASE_URL="postgresql://...@ep-xxxx.../pastebin?sslmode=require" \
  npx prisma migrate deploy
```

If using Neon's pooler with Prisma migrate, append `pgbouncer=true` when required by your Neon connection mode, or prefer the direct host for migrations.

---

## Vercel deployment

### Deployment checklist

1. Push the repository to GitHub/GitLab/Bitbucket (private recommended)
2. Import the project in [Vercel](https://vercel.com)
3. Framework preset: **Next.js**
4. Set environment variables:
   - `DATABASE_URL` — Neon connection string
   - `APP_URL` — `https://<your-vercel-domain>` (or custom domain)
   - `NEXT_PUBLIC_APP_URL` — same value (optional but useful for client code)
   - `TEST_MODE` — leave unset or `false` in production
5. Ensure build runs migrations. This repo includes `vercel.json`:

   ```json
   {
     "buildCommand": "prisma migrate deploy && prisma generate && next build"
   }
   ```

6. Deploy
7. Verify:
   - `POST /api/pastes` returns `201`
   - `GET /api/pastes/:id` returns `200`
   - Homepage loads
   - Created paste URL opens `/p/:id`

### Notes

- Do not enable `TEST_MODE` in production
- Do not hardcode localhost URLs for shareable links
- Prisma Client is generated during install/build (`postinstall` + build command)
- Route handlers use the Node.js runtime (`export const runtime = "nodejs"`)

**Deployment status:** not claimed as completed from this environment. Apply the checklist above with your Neon + Vercel accounts to go live.

---

## Design decisions

1. **Service layer separation** — handlers stay thin; business rules are reusable and testable.
2. **Atomic SQL for views** — correctness under concurrency over ORM convenience.
3. **IDs are public primary keys** — avoids exposing sequential integers.
4. **Soft expiration** — filtering at read time; cleanup is optional.
5. **Server Component paste page** — one retrieval per request; avoids React Strict Mode double-fetch.
6. **Content rendered as plain text** — no `dangerouslySetInnerHTML`.
7. **1 MiB content cap** — practical body limit enforced by Zod on the server and mirrored in the UI.

---

## Known limitations

- No authentication, paste editing, or paste listing/search
- No background job runner; expired rows are filtered, not automatically deleted on a schedule
- Shareable URL quality depends on correctly configuring `APP_URL`
- Very large concurrent spikes are bounded by Neon/Postgres connection limits (use pooled URL)
- Deployment to Vercel/Neon requires your own accounts and credentials

---

## Security notes

- Input validated with Zod
- Parameterized SQL via Prisma / tagged templates
- Secure random IDs (`crypto.randomBytes`)
- Test-time header ignored outside `TEST_MODE`
- Errors never leak stack traces, connection strings, or secrets
- Paste content escaped by React text rendering

---

## License

Private / confidential take-home assignment. Do not publish or redistribute.
