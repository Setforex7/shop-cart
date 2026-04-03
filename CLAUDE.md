# CLAUDE.md

## Project Overview

SAP CAP (Cloud Application Programming) backend with a SAPUI5 frontend. Simulates company buy/sell operations with role-based access (admin vs normal user) and multi-cart support.

## Commands

- **Dev server:** `npm run watch-cap_try` (runs `cds watch` with auto-reload)
- **Production server:** `npm start` (runs `cds-serve`)
- **Lint:** `npm run lint` (ESLint with SAP CAP recommended rules)
- **Tests:** `npm test` (Jest, runs in-band with 20s timeout, uses `@cap-js/cds-test`)

## Authentication (Development)

Mocked auth in `package.json` CDS config:
- `alice` — admin role (full CRUD on Products, Orders, Company management)
- `bob` — User role (read products, manage own carts/orders)

---

## Backend (SAP CAP)

### Data Model — `db/schema.cds`

6 entities, all with UUID keys and `managed` aspect (auto createdBy/createdAt/modifiedBy/modifiedAt):

| Entity | Key relationships | Notes |
|--------|------------------|-------|
| `Company` | has many `Products` | name (mandatory), capital, currency |
| `Products` | belongs to `Company` | unique constraint on `[company, name]` |
| `Orders` | has `Composition of OrderItems`, belongs to `Company` | status enum: Initiated→Shipping→Delivered→Canceled |
| `OrderItems` | belongs to `Orders`, references `Products` | stores `price_at_create` for historical pricing |
| `Cart` | has `Composition of CartItems`, belongs to `Company` | status enum: Active→Ordered→Abandoned; `virtual total_price` |
| `CartItem` | belongs to `Cart`, references `Products` | `virtual price`, `virtual total_price` (computed) |

Seed data in `db/data/`: 3 Companies (EUR), 3 Products, Currencies.

### Service Definition — `srv/shop_cart-service.cds`

Service `ShopCartService` at `/shop`. All entities exposed as projections with `@restrict` RBAC annotations. User-owned resources filtered by `createdBy = $user.id`.

**Bound actions on Cart:** `addProductsToCart(product_IDs: many UUID)`, `finalizeCart()`
**Functions:** `getUserInfo()`, `downloadExcelTemplate()`
**Read-only view:** `UserSpend` (aggregates total_price per company per user)

### Service Wiring — `srv/shop_cart-service.js`

Registers event handlers from 5 handler modules. Connects to DB, sets up cron jobs on `served` event.

### Handlers — `srv/handlers/`

| Handler | Responsibility | Critical logic |
|---------|---------------|----------------|
| `cart.js` | Cart lifecycle, add products, finalize | `finalizeCart`: validates stock, creates Order+OrderItems, atomic stock decrement (`UPDATE WHERE stock >= qty`), updates company capital, sets cart to Ordered |
| `products.js` | Product validation, cascading delete | Deletes CartItems on product deletion; validates name/price/stock on create |
| `User.js` | Authentication | Returns user ID and roles; rejects 401 if unauthenticated |
| `excel.js` | Excel template generation | Creates `.xlsx` template via `exceljs` for bulk product upload |
| `jobs.js` | Background cron jobs (skipped in test) | Cart abandonment (1 min idle → Abandoned); Order progression (2 min → Shipping, 5 min → Delivered) |

### Key Transaction: Cart Finalization

1. Validate cart is Active with items
2. For each item: atomic stock decrement with `UPDATE ... WHERE stock >= qty` (prevents overselling)
3. Create `Order` + `OrderItems` (preserves price at order time)
4. Update `Company.capital += cart total`
5. Set cart status to `Ordered`

---

## Frontend (SAPUI5)

Single UI5 app at `app/cap_try/webapp/`. OData v4 with `$auto` batch grouping. Theme: `sap_horizon_dark`.

### Routes

| Route | View | Purpose |
|-------|------|---------|
| `/` (default) | Shop | Product browsing, cart management, company selection |
| `/Reports` | Reports | Order analytics with FlexibleColumnLayout, Excel export |
| `/Settings` | Settings | Admin-only: company CRUD, cart overview (SideNavigation layout) |

### Controllers — `webapp/controller/`

| Controller | Extends | Purpose |
|-----------|---------|---------|
| `BaseController.js` | `sap.ui.core.mvc.Controller` | Shared: i18n, DialogHandler, Router, MessageService, user info, OData helpers. All controllers extend this. |
| `Shop.controller.js` | BaseController | Product CRUD, cart operations (add/finalize/delete), Excel upload/download, company selection |
| `Reports.controller.js` | BaseController | Order table with company filter, FCL detail view, Excel export |
| `Settings.controller.js` | BaseController | Company CRUD with IconTabBar (Edit/Create), cart admin view |
| `DialogHandler.js` | `sap.ui.base.Object` | Fragment lazy loading and lifecycle management (not a controller) |

### Services — `webapp/service/`

Frontend service layer encapsulating OData operations:

| Service | Operations |
|---------|-----------|
| `ProductService.js` | create, createBatch (Excel upload), edit, delete, loadByCompany |
| `CartService.js` | finalize, create, delete, addProducts, deleteItem, assignOnCompanyLoad, bindDataToFragment |
| `CompanyService.js` | create, edit, clearSelected |
| `MessageService.js` | Singleton message manager with Popover display (init, addMessage, deleteMessages, toggleMessageView) |
| `FileService.js` | Excel file reading via XLSX library |

### Fragments — `webapp/view/fragments/`

ProductsTable, Cart, Carts, Companies, AddCompany, EditCompany, addProduct, EditProduct.

### Models

- Default `""`: OData v4 model (`/shop/`)
- `globalModel`: JSON model for UI state (selected company, cart, user info)
- `messageModel`: JSON model for message management
- `device`: Device model from `sap.ui.Device`
- `i18n`: Resource bundle (English only, `i18n/i18n.properties`)

### Admin Visibility

Expression binding: `visible="{= ${globalModel>/userInfo/roles}.includes('admin') }"`. Backend enforces via `@restrict`.

---

## Tests — `test/`

Jest with `@cap-js/cds-test`. 6 test suites using mocked auth (alice=admin, bob=User):

| Test file | Coverage |
|-----------|----------|
| `cart.test.js` | Cart creation (auto-naming), ownership isolation, addProductsToCart, finalizeCart (stock/capital updates) |
| `products.test.js` | CRUD validation, quantity enrichment, cascading CartItem delete |
| `auth.test.js` | getUserInfo, 401 rejection, RBAC (admin vs user restrictions) |
| `company.test.js` | Company reads, write restrictions (admin-only) |
| `orders.test.js` | Order visibility (user isolation vs admin), order structure |
| `excel.test.js` | Template download, MIME type, binary response |

---

## CDS Conventions

- Currency fields use CDS `Currency` type from `@sap/cds/common` — stores as `currency_code` in DB, exposed as `currency` in projections.
- `Cart` and `CartItem` have `virtual` fields computed in after-READ handlers or service projections, not persisted.
- `Cart.cart_total` computed via inline subquery in the service projection.

## Deployment

- **Dev:** SQLite (in-memory), mocked auth
- **Production:** SAP HANA (`.cdsrc.json` [production]), XSUAA auth (`xs-security.json`), deployed via MTA (`mta.yaml`) to SAP BTP Cloud Foundry
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) — lint + test on push/PR to main, Node 22

---

## Agent Task Routing

When working on this project, scope your changes based on the area being modified:

### Cart / Order logic
- **Read first:** `srv/handlers/cart.js`, `srv/shop_cart-service.cds` (Cart/CartItem/Orders projections), `db/schema.cds` (Cart, CartItem, Orders, OrderItems entities)
- **Frontend touchpoints:** `webapp/service/CartService.js`, `webapp/controller/Shop.controller.js` (cart methods), `webapp/view/fragments/Cart.fragment.xml`
- **Test:** `test/cart.test.js`, `test/orders.test.js`

### Product management
- **Read first:** `srv/handlers/products.js`, `srv/shop_cart-service.cds` (Products projection), `db/schema.cds` (Products entity)
- **Frontend touchpoints:** `webapp/service/ProductService.js`, `webapp/controller/Shop.controller.js` (product methods), `webapp/view/fragments/ProductsTable.fragment.xml`, `webapp/view/fragments/addProduct.fragment.xml`, `webapp/view/fragments/EditProduct.fragment.xml`
- **Test:** `test/products.test.js`

### Company management
- **Read first:** `db/schema.cds` (Company entity), `srv/shop_cart-service.cds` (Company projection)
- **Frontend touchpoints:** `webapp/service/CompanyService.js`, `webapp/controller/Settings.controller.js`, `webapp/view/fragments/Companies.fragment.xml`, `webapp/view/fragments/AddCompany.fragment.xml`, `webapp/view/fragments/EditCompany.fragment.xml`
- **Test:** `test/company.test.js`

### Authentication / Authorization
- **Read first:** `srv/handlers/User.js`, `srv/shop_cart-service.cds` (@restrict annotations), `package.json` (auth mock config), `xs-security.json`
- **Test:** `test/auth.test.js`

### Background jobs
- **Read first:** `srv/handlers/jobs.js`
- **Related:** `db/schema.cds` (Cart.status, Orders.status enums)

### Excel import/export
- **Read first:** `srv/handlers/excel.js` (template generation), `webapp/service/FileService.js` (file reading), `webapp/controller/Shop.controller.js` (`onUploadTemplatePress`/`onDownloadTemplatePress`)
- **Test:** `test/excel.test.js`

### Reports / Orders view
- **Read first:** `webapp/controller/Reports.controller.js`, `webapp/view/Reports.view.xml`
- **Related:** `srv/shop_cart-service.cds` (Orders, OrderItems, UserSpend projections)

### UI shared infrastructure
- **Read first:** `webapp/controller/BaseController.js`, `webapp/controller/DialogHandler.js`, `webapp/service/MessageService.js`
- **Related:** `webapp/manifest.json` (routing, models), `webapp/Component.js`

### Deployment / CI
- **Read first:** `mta.yaml`, `.cdsrc.json`, `xs-security.json`, `.github/workflows/ci.yml`
