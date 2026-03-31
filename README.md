# Shop Cart - SAP CAP + SAPUI5

A full-stack application simulating company buy/sell operations with role-based access control, multi-cart support, and order lifecycle management. Built with SAP Cloud Application Programming Model (CAP) on the backend and SAPUI5 on the frontend.

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
git clone https://github.com/<your-username>/shop-cart.git
cd shop-cart
```

### 2. Install dependencies

```bash
npm install
```

This installs both backend (SAP CAP, Express, node-cron, exceljs) and frontend dependencies. The app uses **SQLite** as an in-memory database for local development - no database setup required.

### 3. Start the development server

```bash
npm run cds deploy
npm run watch-cap_try
```

This runs `cds watch` with auto-reload and opens the SAPUI5 app in your default browser. The app will be available at:

- **UI5 App:** [http://localhost:4004/cap_try/webapp/index.html](http://localhost:4004/cap_try/webapp/index.html)
- **OData Service:** [http://localhost:4004/odata/v4/ShopCartService](http://localhost:4004/odata/v4/ShopCartService)
- **CDS Index Page:** [http://localhost:4004](http://localhost:4004)

> The database is seeded automatically with sample companies, products, and currencies from the CSV files in `db/data/`.

## Authentication (Mocked)

In local development, authentication is mocked. When prompted for credentials, use one of the following users:

| Username | Password   | Role    | Permissions |
|----------|------------|---------|-------------|
| `alice`  | *(empty)*  | Admin   | Full CRUD on Products, Orders, Companies, Carts |
| `bob`    | *(empty)*  | User    | Browse products, manage own carts, place orders |

> Leave the password field **empty** for both users.

## Using the App

### As a Regular User (bob)

#### Shop Page (Default)
1. Log in as `bob` (leave password empty).
2. You land on the **Shop** page showing all available products.
3. Products display stock status with color indicators:
   - **Green** - stock is above the minimum threshold.
   - **Yellow/Red** - stock is low or critical.

#### Managing Your Cart
1. Click on a product to add it to your cart.
2. Use the **Cart** panel to view items you've added.
3. Adjust quantities or remove items as needed.
4. You can create **multiple carts** for different companies.

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

### As an Admin (alice)

Admins have access to everything a regular user can do, plus:

#### Settings Page
- Navigate to **Settings** (visible only to admins).
- **Manage Companies** - Create, edit, or delete companies.
- **Manage Products** - Add new products (including bulk upload via Excel template), edit existing products, or delete them.
- **View All Carts** - Monitor all user carts across the system.

#### Product Management
1. Go to the Shop page.
2. Use the **Add Product** button to create new products.
3. Click on any product to **Edit** or **Delete** it.
4. Use the **Excel template** feature to bulk-upload products.

#### Company Management
1. Go to **Settings** > **Companies**.
2. Add new companies with name, description, capital, and currency.
3. Edit or remove existing companies.

## Project Structure

```
shop-cart/
  app/
    cap_try/webapp/        # SAPUI5 frontend
      controller/          # View controllers (BaseController, Shop, Reports, Settings)
      view/                # XML views and fragments
      formatters/          # UI formatters (stock status, etc.)
      i18n/                # Internationalization
      model/               # UI5 models
      service/             # Frontend service layer
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
  package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run watch-cap_try` | Start dev server with auto-reload and open the UI5 app |
| `npm start` | Start the production server |
| `npm test` | Run tests with Jest |
| `npx eslint .` | Lint the codebase |

## Key Concepts

- **SQLite In-Memory Database** - No external database needed. Data is seeded on every restart from CSV files in `db/data/`.
- **OData V4** - The frontend communicates with the backend via OData V4 with two-way binding.
- **Role-Based Access Control** - Enforced both on the backend (`@restrict` annotations) and the frontend (conditional UI visibility).
- **Background Jobs** - `node-cron` handles cart abandonment detection (1 min idle) and order status progression.

## Deployment

This app is deployment-ready for SAP Business Technology Platform (BTP). For local development, it runs entirely on SQLite with mocked authentication - no cloud services required.

## Learn More

- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [SAPUI5 Documentation](https://sapui5.hana.ondemand.com/)
- [SAP CDS CLI Reference](https://cap.cloud.sap/docs/tools/cds-cli)
