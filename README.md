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

## Roles seeded by default

Super Administrator, Inventory Manager, Warehouse Officer, Shop Manager, Cashier, Accountant,
Auditor - matching the SRS's user categories, each with a starting permission set and (for
sales roles) a maximum discount percentage. Roles and their permissions can be edited under
**Users & Roles** by an administrator.

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
