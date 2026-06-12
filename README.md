# Shop Cart - SAP CAP + SAPUI5

![CI](https://github.com/Setforex7/shop-cart/actions/workflows/ci.yml/badge.svg)

A full-stack application simulating company buy/sell operations with role-based access control, multi-cart support, and order lifecycle management. Built with SAP Cloud Application Programming Model (CAP) on the backend and SAPUI5 on the frontend, deployed to SAP BTP Cloud Foundry.

<!-- 📸 SCREENSHOT: Shop page overview — logged in as admin, with the company selected,
     the products table populated and the cart panel visible. This is the "hero" image. -->

## Highlights

- **SAP CAP backend** (Node.js, OData V4) with a 6-entity domain model and `@restrict`-based RBAC
- **SAPUI5 frontend** (`sap_horizon_dark` theme) with a service-layer architecture and reusable fragments
- **Transactional cart finalization** — atomic stock decrement (`UPDATE ... WHERE stock >= qty`) prevents overselling under concurrency
- **Background jobs** via `node-cron` — cart abandonment detection and automatic order status progression
- **Excel integration** — bulk product upload via generated `.xlsx` template (`exceljs` server-side, `XLSX` client-side)
- **Tested**: 49 backend Jest tests (`@cap-js/cds-test`) + 121 frontend QUnit tests (Karma, headless Chrome), both in CI
- **Cloud-ready**: MTA deployment to SAP BTP Cloud Foundry with HANA Cloud, XSUAA and the HTML5 Application Repository

## Prerequisites

- **Node.js** >= 18 (LTS recommended)
- **npm** >= 9
- **SAP CDS CLI** - installed globally:

```bash
npm install -g @sap/cds-dk
```

> Verify the installation with `cds --version`.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Setforex7/shop-cart.git
cd shop-cart
```

### 2. Install dependencies

```bash
npm install
```

This installs both backend (SAP CAP, Express, node-cron, exceljs) and frontend dependencies. The app uses **SQLite** as an in-memory database for local development - no database setup required.

### 3. Start the development server

```bash
npm run watch-cap_try
```

This runs `cds watch` with auto-reload and opens the SAPUI5 app in your default browser. The app will be available at:

- **UI5 App:** [http://localhost:4004/cap_try/webapp/index.html](http://localhost:4004/cap_try/webapp/index.html)
- **OData Service:** [http://localhost:4004/shop](http://localhost:4004/shop)
- **CDS Index Page:** [http://localhost:4004](http://localhost:4004)

> The database is seeded automatically with sample companies, products, and currencies from the CSV files in `db/data/`.

## Authentication (Mocked)

In local development, authentication is mocked. When prompted for credentials, use one of the following users:

| Username | Password   | Role    | Permissions |
|----------|------------|---------|-------------|
| `alice`  | *(empty)*  | Admin   | Full CRUD on Products, Orders, Companies, Carts |
| `bob`    | *(empty)*  | User    | Browse products, manage own carts, place orders |

> Leave the password field **empty** for both users.

In production the same roles are enforced by **XSUAA** (`xs-security.json` defines the `ShopCart_Admin` and `ShopCart_User` role collections).

## Using the App

### As a Regular User (bob)

#### Shop Page (Default)
1. Log in as `bob` (leave password empty).
2. You land on the **Shop** page showing all available products.
3. Products display stock status with color indicators:
   - **Green** - stock is above the minimum threshold.
   - **Yellow/Red** - stock is low or critical.

<!-- 📸 SCREENSHOT: Shop page as bob — products table with the colored stock
     indicators visible (ideally one green, one yellow/red row). -->

#### Managing Your Cart
1. Click on a product to add it to your cart.
2. Use the **Cart** panel to view items you've added.
3. Adjust quantities or remove items as needed.
4. You can create **multiple carts** for different companies.

<!-- 📸 SCREENSHOT: Cart dialog open with a few items in it, showing quantities
     and the computed cart total. -->

#### Placing an Order
1. Once your cart is ready, click **Finalize Cart**.
2. The system will:
   - Validate that all products have enough stock.
   - Create an order with all cart items.
   - Deduct product stock accordingly.
   - Update the company's capital.
   - Mark the cart as "Ordered".
3. Your order will progress automatically through statuses:
   - **Initiated** -> **Shipping** (after ~2 minutes) -> **Delivered** (after ~5 minutes)

#### Reports Page
- Navigate to **Reports** to view your order history and analytics.
- Uses a Flexible Column Layout (FCL) for master-detail navigation.
- Export order data to Excel.

<!-- 📸 SCREENSHOT: Reports page with the FlexibleColumnLayout open — orders list
     on the left, one order's detail (items) on the right. -->

### As an Admin (alice)

Admins have access to everything a regular user can do, plus:

#### Settings Page
- Navigate to **Settings** (visible only to admins).
- **Manage Companies** - Create, edit, or delete companies.
- **View All Carts** - Monitor all user carts across the system.

<!-- 📸 SCREENSHOT: Settings page as alice — the SideNavigation layout with the
     company management (IconTabBar Edit/Create) visible. -->

#### Product Management
1. Go to the Shop page.
2. Use the **Add Product** button to create new products.
3. Click on any product to **Edit** or **Delete** it.
   - Products referenced by existing orders cannot be deleted (the backend rejects with **409**) so order history is never orphaned.
4. Use the **Excel template** feature to bulk-upload products: download the generated template, fill it in, and upload it back.

<!-- 📸 SCREENSHOT: Add Product dialog open (this was the bug fixed for the
     case-sensitive HTML5 repo — nice to show it working in the cloud). -->

#### Company Management
1. Go to **Settings** > **Companies**.
2. Add new companies with name, description, capital, and currency.
3. Edit or remove existing companies.

## Project Structure

```
shop-cart/
  app/
    cap_try/
      webapp/              # SAPUI5 frontend
        controller/        # View controllers (BaseController, Shop, Reports, Settings)
        view/              # XML views and fragments
        formatters/        # UI formatters (stock status, etc.)
        i18n/              # Internationalization
        model/             # UI5 models
        service/           # Frontend service layer
        test/unit/         # QUnit tests (121 tests, run via Karma)
      ui5-deploy.yaml      # Production build config (HTML5 repo zip)
    router/                # Standalone approuter (entry point / XSUAA login)
  db/
    schema.cds             # Domain model (Orders, Products, Cart, Company, etc.)
    data/                  # CSV seed data
  srv/
    shop_cart-service.cds  # Service definition with RBAC annotations
    shop_cart-service.js   # Service handler entry point
    handlers/              # Business logic handlers
      cart.js              # Cart operations and finalization
      products.js          # Product validation and cleanup
      jobs.js              # Background cron jobs (cart abandonment, order progression)
      excel.js             # Excel template generation
  test/                    # Backend Jest tests (49 tests, @cap-js/cds-test)
  mta.yaml                 # Multi-target application descriptor (BTP deployment)
  xs-security.json         # XSUAA scopes, roles and role collections
```

## Available Scripts

| Command | Where | Description |
|---------|-------|-------------|
| `npm run watch-cap_try` | root | Start dev server with auto-reload and open the UI5 app |
| `npm start` | root | Start the production server |
| `npm test` | root | Run the backend Jest suite (49 tests) |
| `npm run lint` | root | Lint the codebase (ESLint, SAP CAP rules) |
| `npm test` | `app/cap_try` | Run the frontend QUnit suite via Karma (121 tests, headless Chrome) |
| `npm run build` | `app/cap_try` | Production UI5 build (zipped for the HTML5 Application Repository) |

## Key Concepts

- **SQLite In-Memory Database** - No external database needed locally. Data is seeded on every restart from CSV files in `db/data/`.
- **OData V4** - The frontend communicates with the backend via OData V4 with `$auto` batch grouping.
- **Role-Based Access Control** - Enforced on the backend (`@restrict` annotations, user-owned data filtered by `createdBy = $user.id`) and mirrored on the frontend (conditional UI visibility).
- **Background Jobs** - `node-cron` handles cart abandonment detection (idle carts become Abandoned) and order status progression (Initiated → Shipping → Delivered).

## Testing & CI

- **Backend:** `npm test` — 49 Jest tests over the live service using `@cap-js/cds-test` (cart lifecycle, stock/capital math, RBAC, Excel template, validations).
- **Frontend:** `npm test` in `app/cap_try` — 121 QUnit tests run by Karma in headless Chrome (controllers, services, dialog handling).
- **CI:** GitHub Actions runs lint + both test suites on every push/PR to `main` (`.github/workflows/ci.yml`).

## Deployment (SAP BTP Cloud Foundry)

The app is deployed as a **multi-target application (MTA)**: CAP backend bound to **SAP HANA Cloud** and **XSUAA**, a standalone **approuter** as the authenticated entry point, and the UI5 app served from the **HTML5 Application Repository**.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full step-by-step guide (entitlements, HANA Cloud setup, `mbt build`, `cf deploy`, role assignment and troubleshooting).

For local development none of this is required — everything runs on SQLite with mocked authentication.

## Learn More

- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [SAPUI5 Documentation](https://sapui5.hana.ondemand.com/)
- [SAP CDS CLI Reference](https://cap.cloud.sap/docs/tools/cds-cli)
