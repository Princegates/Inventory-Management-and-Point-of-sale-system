# Inventory Management & Point-of-Sale System

A full-stack, integrated Inventory Management and Point-of-Sale (POS) system, built from the
project's Software Requirements Specification (SRS). The system is transaction-driven: every
purchase, sale, transfer, return and adjustment flows through a single inventory engine, so
stock, sales and financial reports are always derived from one consistent ledger rather than
manual reconciliation.

## Architecture

```
client/   React 18 + Vite + Tailwind CSS  -> management dashboard & POS terminal (SPA)
server/   Node.js + Express + Sequelize   -> REST API
          PostgreSQL                      -> relational database
```

## Documentation

- **[docs/IMS-POS-User-Manual.docx](docs/IMS-POS-User-Manual.docx)** - for staff (cashiers, shop
  managers, inventory staff, accountants, administrators): how to use every screen, day-to-day
  workflow checklists, and a troubleshooting FAQ.
- **[docs/IMS-POS-Technical-Reference.docx](docs/IMS-POS-Technical-Reference.docx)** - for
  developers: architecture, the inventory engine's internals, database schema, full API
  reference, and how the SRS's business rules map to the code.

The POS is not a separate application - it is one interface into the same API, models and
inventory engine used by the warehouse and reporting modules (see `server/src/services/inventoryEngine.js`).

### Core inventory engine

`server/src/services/inventoryEngine.js` is the single choke point for every stock mutation.
No controller writes to the `inventory` table directly - purchases, sales, transfers,
adjustments, returns and stock counts all call `applyMovement` (or the transfer-specific
`issueToTransit` / `receiveFromTransit`) inside a database transaction. This guarantees:

- every movement produces exactly one immutable row in `inventory_transactions` (the ledger)
- concurrent POS sales can never drive stock below zero (row-level locking, not just UI checks)
- a sale's payment and inventory deduction either both commit or both roll back together

### Key modules implemented

- **Auth & RBAC** - JWT auth, granular permission codes assigned to roles (not hard-coded),
  location-based access control (a cashier can be restricted to a single shop; Head Office
  users get global access).
- **Catalog** - products, categories/subcategories, brands, units, suppliers, customers, with
  tracked price history on every price change.
- **Inventory** - per (product, location) balances, full movement ledger, low-stock/out-of-stock
  detection, in-transit and damaged-stock buckets.
- **Purchasing** - purchase orders with an approval workflow, goods receiving (only accepted
  quantity enters inventory; damaged/missing are recorded separately).
- **Stock transfers** - request -> approve -> issue -> in transit -> receive, with the source
  location's stock parked in an "in transit" bucket until the destination confirms receipt.
- **Stock counts & adjustments** - physical count sessions with system/physical/variance,
  approval-gated adjustments, all reasons audited.
- **POS** - barcode/SKU/name search, cart, per-line discounts (capped by the cashier's role),
  tax, split payments, receipts, cashier sessions with cash variance on close.
- **Sales lifecycle** - void/reverse (never hard-deleted), returns with resalable-vs-damaged
  inventory handling, cost-of-goods-sold and gross profit computed per sale.
- **Reporting & dashboard** - inventory valuation, low-stock/expiry reports, sales by
  product/shop/cashier/customer/payment method, purchasing summaries, profitability.
- **Audit trail** - read-only log of sensitive actions (logins, price changes, adjustments,
  voids, approvals, etc.), written internally and never editable through the API.

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or use the provided `docker-compose.yml`)

### 1. Database

```bash
docker compose up -d          # starts Postgres on localhost:5432
# or point server/.env at an existing Postgres instance
```

### 2. Backend

```bash
cd server
cp .env.example .env          # adjust DB credentials / JWT secret as needed
npm install
npm run seed                  # creates roles, permissions, default locations, units,
                               # and an admin user (see console output for credentials)
npm run dev                   # http://localhost:4000
```

Default seeded login: `admin@example.com` / `Admin123!` (override via `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` in `.env` before seeding).

The server creates/updates tables automatically on boot via `sequelize.sync()`. For a
production deployment, replace this with proper `sequelize-cli` migrations.

### 3. Frontend

```bash
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api to the server)
```

Open `http://localhost:5173`, sign in, and:

- Go to **Products** to create a product, then **Goods Receiving** to bring in opening stock.
- Use **Stock Transfers** to move stock from the warehouse to a shop.
- Go to **Point of Sale**, open a cashier session at that shop, and ring up a sale.
- Check **Dashboard** and **Reports** to see the numbers update immediately.

## Publishing (Supabase + Render + Netlify)

The codebase is unchanged for this path - only configuration differs from local dev. Three
services, in this order:

### 1. Database - Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings -> Database -> Connection string -> **URI**, "Transaction pooler" mode
   (works from a serverless/PaaS host, unlike the direct connection). Copy it - you'll set this
   as `DATABASE_URL` in Render.
3. Nothing else to do here - the API creates its own tables on boot via `sequelize.sync()`, and
   `npm run seed` populates roles/permissions/an admin user. Supabase's own Auth/Storage/RLS
   features are unused; it's acting purely as a managed Postgres instance for the Express API.

### 2. API - Render

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Render: **New** -> **Blueprint**, point it at the repo - it will read `render.yaml` at the
   root and create the `ims-pos-api` web service (root directory `server/`).
3. Fill in the env vars Render leaves blank: `DATABASE_URL` (from Supabase, step 1),
   `CORS_ORIGIN` (your Netlify URL - can be filled in after step 3), `SEED_ADMIN_EMAIL`,
   `SEED_ADMIN_PASSWORD`. `JWT_SECRET` is auto-generated.
4. Deploy. `npm run seed` runs automatically on each boot (idempotent) before `npm start`, so
   roles/permissions/the admin user are always present. Note the service URL Render gives you,
   e.g. `https://ims-pos-api.onrender.com`.

### 3. Client - Netlify

1. In Netlify: **Add new site** -> import this repo, set **Base directory** to `client`. It will
   pick up `client/netlify.toml` for the build command and publish directory automatically.
2. Edit `client/netlify.toml` and replace the `to =` target in the `/api/*` redirect with your
   actual Render URL from step 2, then commit/push (Netlify redeploys on push). This makes
   Netlify proxy `/api/*` requests straight through to Render at its edge, so the browser only
   ever talks to your Netlify domain - no CORS configuration needed on the client side.
3. Deploy. Once you have the Netlify URL, go back to Render and set `CORS_ORIGIN` to it (needed
   for any direct, non-proxied calls, e.g. from a future mobile client).

Sign in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in step 2 and change the
password from the app once logged in.

## Publishing (all-in-one on cPanel)

Some cPanel plans (e.g. Namecheap's Stellar Plus/Business) can host all three pieces directly -
database, API and static client - with nothing external needed. Check first: under cPanel's
**Databases** section you need a **PostgreSQL Databases** icon (not just MySQL), and under
**Software** you need **Setup Node.js App**. If both are there, this path works as-is.

The API is put on its own subdomain (e.g. `api.yourdomain.com`) rather than a subpath of the
main domain - this avoids the static site's SPA-fallback `.htaccess` rule and the Node app's
own routing fighting over the same path, and is the standard pattern cPanel's Node Selector is
built for.

### 1. Database

cPanel -> **Databases** -> **PostgreSQL Database Wizard**. Create a database and a user (cPanel
prefixes both with your account username, e.g. `youruser_ims_pos` / `youruser_imsapp`), grant
the user all privileges on the database, and note the password. The host is `localhost` and the
port is `5432` when the app and database are on the same cPanel account (the normal case).

### 2. API

1. Create the subdomain first: cPanel -> **Domains** -> **Subdomains** -> add `api` (document
   root doesn't matter, the Node app will own that URL).
2. Upload the `server/` folder's contents to a directory *outside* `public_html`, e.g.
   `~/ims-pos-api` (via **File Manager** or SFTP/SSH - "Manage Shell" in your screenshot means
   you have terminal access, so `git clone` the repo there directly is easiest).
3. cPanel -> **Software** -> **Setup Node.js App** -> **Create Application**:
   - Node.js version: latest available LTS
   - Application mode: Production
   - Application root: `ims-pos-api` (the folder from step 2)
   - Application URL: the `api` subdomain from step 1
   - Application startup file: `src/server.js`
4. Add environment variables in the same screen: `NODE_ENV=production`, `DB_HOST=localhost`,
   `DB_PORT=5432`, `DB_NAME`/`DB_USER`/`DB_PASSWORD` from step 1, `JWT_SECRET` (any long random
   string), `JWT_EXPIRES_IN=12h`, `CORS_ORIGIN=https://yourdomain.com` (your main domain, from
   step 3 below).
5. Click **Run NPM Install** in the same screen (or, via the shell command cPanel shows at the
   top of the page, which activates that app's own Node/npm - regular system `npm` won't have
   the right version). Then **Restart** the app.
6. Seed the database once: open **Manage Shell** (or SSH in), run the activation command cPanel
   gave you in step 5, `cd` into the app root, and run `npm run seed`. Note the admin
   credentials it prints. Re-running it later is harmless (idempotent) if you ever need to.
7. Visit `https://api.yourdomain.com/health` - you should get `{"status":"ok"}`.

### 3. Client

1. Build locally with the API's URL baked in:
   ```bash
   cd client
   VITE_API_BASE_URL=https://api.yourdomain.com/api npm run build
   ```
2. Upload the *contents* of `client/dist/` (not the folder itself) into `public_html` (File
   Manager or SFTP). This includes the `.htaccess` that makes client-side routes like `/products`
   or `/pos` work on a direct link or refresh.
3. Visit `https://yourdomain.com`, sign in, and confirm a page that hits the API (e.g.
   Dashboard) loads data.

If `mod_rewrite` isn't enabled on your account the SPA fallback in `.htaccess` won't work and
direct links to non-root routes will 404 - Namecheap shared hosting has it on by default, but if
you hit this, cPanel support can confirm/enable it.

## Roles seeded by default

Super Administrator, Inventory Manager, Warehouse Officer, Shop Manager, Cashier, Accountant,
Auditor - matching the SRS's user categories, each with a starting permission set and (for
sales roles) a maximum discount percentage. Roles and their permissions can be edited under
**Users & Roles** by an administrator.

## Password reset emails

"Forgot password" sends a real email (via [Resend](https://resend.com)) with a link to set a new
password:

1. Sign up at resend.com and grab an API key from the dashboard.
2. Set `RESEND_API_KEY` in `server/.env`. Resend's shared `onboarding@resend.dev` sender
   (the default `EMAIL_FROM`) works immediately with no domain setup, but only delivers to the
   email address you signed up to Resend with - verify your own domain in Resend and set
   `EMAIL_FROM` to an address on it once you're ready to email real users.
3. Set `FRONTEND_URL` to wherever the client is actually served (defaults to
   `http://localhost:5173`) - it's used to build the link inside the email.

Without `RESEND_API_KEY` set, nothing is emailed - the "Forgot password" page instead shows the
reset link directly on screen, so the flow stays testable with no email account at all. This is
meant for local development only; set the key before relying on this for real users.

## Scope notes

This build implements the SRS's MVP feature set (section 67) plus stock counts and a
dashboard. Explicitly deferred to a later phase, per the SRS's own phased plan (section 66/61):
offline POS, customer loyalty points logic, accounting/payment-gateway integrations, a native
mobile app, and AI-based demand forecasting. Email/SMS notification delivery is stubbed as
in-app notifications only (`notifications` table) - wiring an email/SMS provider is a drop-in
addition to `server/src/services/notifier.js`.

## Tests

A representative slice of the system was validated end-to-end during development: the full
purchase -> transfer -> POS sale -> return -> cashier-session-close cycle was exercised against
a real PostgreSQL database (concurrency-safe stock deduction, oversell prevention, and cash
variance calculations all verified), and the client was driven through every page in a real
browser. Add `npm test` suites under `server/tests` for regression coverage as the codebase
evolves.
