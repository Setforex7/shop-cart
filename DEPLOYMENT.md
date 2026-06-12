# Deploying shop-cart to SAP BTP (Cloud Foundry)

This is a multi-target application (MTA). One `.mtar` archive deploys four things:

| Module | What it is | CF app / service |
|--------|-----------|------------------|
| `shop-cart-srv` | CAP backend (Node.js) | app, bound to HANA + XSUAA |
| `shop-cart-db-deployer` | HANA table/view deployer (runs once) | task |
| `shop-cart-app` | Standalone approuter (entry point / login) | app, bound to XSUAA + HTML5 runtime |
| `shop-cart-app-deployer` | Uploads the built UI5 app to the HTML5 App Repository | task |

Resources provisioned: SAP HANA Cloud (`hdi-shared`), XSUAA (`application`), HTML5 Application Repository (`app-host` + `app-runtime`).

---

## 0. Prerequisites (one-time, on your machine)

```powershell
# Cloud Foundry CLI  — already installed (cf 8.x)
cf version

# MultiApps plugin — required for `cf deploy`  (NOT yet installed)
cf install-plugin multiapps

# MTA Build Tool — already installed globally
mbt --version

# GNU make — required by mbt on Windows (NOT installed; needs admin)
#   Run this in an ELEVATED (Administrator) PowerShell:
choco install make
#   ...or skip make entirely and build the .mtar in SAP Business
#   Application Studio (BAS has mbt + make preinstalled).
```

> **Why make?** `mbt build` generates a Makefile and runs `make` to orchestrate
> the per-module builds. Without it you'll see `exec: "make": executable file
> not found`. BAS is the friction-free alternative if you can't install make.

---

## 1. BTP subaccount entitlements (one-time)

In the BTP cockpit for the target subaccount, make sure these entitlements/quotas
are assigned to your space:

- **Cloud Foundry Runtime** (≥ ~1 GB free; this app uses ~0.5 GB across srv + approuter)
- **SAP HANA Cloud** — plan `hana` / `hdi-shared`
- **HTML5 Application Repository** — plans `app-host` and `app-runtime`
- **Authorization & Trust Management (XSUAA)** — plan `application`

### Trial-specific ⚠️
- BTP **trial** supports one SAP HANA Cloud instance, but it **auto-stops every
  night**. Before each deploy (and each time you use the app), open the cockpit
  and **restart the HANA Cloud instance**, or the DB deployer / runtime will fail
  to connect.
- You are currently logged into an **enterprise** org
  (`api.cf.eu10.hana.ondemand.com`, Deloitte). If you mean to deploy to your
  **trial** subaccount, switch targets in step 2 to the trial API endpoint
  (e.g. `https://api.cf.us10-001.hana.ondemand.com` — check your trial cockpit).

---

## 2. Log in and target the space

```powershell
cf login        # or: cf api <your-API-endpoint>; cf login --sso
cf target -o <your-org> -s <your-space>
cf target       # confirm org + space are set
```

Make sure a HANA Cloud instance exists and is **RUNNING** in this space:

```powershell
cf services     # look for a HANA instance; if none, create one in the cockpit
```

---

## 3. Build the archive

From the project root (`shop-cart/`):

```powershell
mbt build -p=cf
```

This runs `cds build --production` + each module build and produces:

```
mta_archives/shop-cart_1.0.0.mtar
```

(If you don't have `make`, build this in BAS instead and download the `.mtar`.)

---

## 4. Deploy

```powershell
cf deploy mta_archives/shop-cart_1.0.0.mtar
```

First deploy takes several minutes (creates services, stages two apps, runs the
DB + HTML5 deployers). Re-running is idempotent — it updates in place.

---

## 5. Post-deploy: assign roles

The app uses XSUAA scopes. Until you assign a role collection, every data call
returns 403 and admin features are hidden.

1. BTP cockpit → **Security → Role Collections**.
2. You'll see `ShopCart_Admin` and `ShopCart_User` (defined in `xs-security.json`).
3. Assign `ShopCart_Admin` to your user (Security → Users → your user → Role Collections).
4. Log out / back in so the new scopes land in your token.

---

## 6. Open the app

```powershell
cf app shop-cart-app      # copy the "routes" URL
```

Open `https://<shop-cart-app route>/` → it redirects through XSUAA login, then
serves the Shop UI. The UI calls the backend at `/shop/` (routed to `shop-cart-srv`),
and static content is served from the HTML5 repo at `/cap_try/`.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|--------|-------------|-----|
| `exec: "make"... not found` during `mbt build` | GNU make missing | `choco install make` (admin) or build in BAS |
| DB deployer fails / `srv` crashes with connection error | HANA Cloud instance stopped (trial nightly auto-stop) | Restart HANA Cloud in cockpit, redeploy |
| Blank page at the approuter root | UI not found at expected path | Confirm `app/router/xs-app.json` `welcomeFile` is `/cap_try/index.html` (it is) and the `shop-cart-app-deployer` task succeeded |
| Login loops / `redirect_uri` mismatch | Approuter URL not allowed by XSUAA | Add the approuter URL to `xs-security.json` → `oauth2-configuration.redirect-uris`, e.g. `["https://*.<your-cf-domain>/**"]`, then redeploy (see note below) |
| 403 on all data, no admin buttons | Role collection not assigned | Do step 5, then re-login |
| `cf deploy` unknown command | MultiApps plugin missing | `cf install-plugin multiapps` |

### redirect-uris note
Standalone-approuter logins usually work out of the box. If you hit a redirect
error, add this to `xs-security.json` and redeploy:

```json
"oauth2-configuration": {
  "redirect-uris": ["https://*.<your-cf-apps-domain>/**"]
}
```
Replace `<your-cf-apps-domain>` with your landscape domain (e.g.
`cfapps.us10-001.hana.ondemand.com`), visible in any deployed app's route.

---

## What changed to make this deployable

- Added `@cap-js/hana` driver (the deployed backend had **no** HANA driver before).
- Scoped auth by profile: **production → XSUAA**, dev/test → mocked. Previously the
  global mocked-auth config leaked into production (no real authentication).
- Wired the **HTML5 Application Repository** into `mta.yaml` (app-content deployer +
  host/runtime services) so the UI5 frontend is actually served — it wasn't before.
- Added a UI5 `build` script + `ui5-deploy.yaml` (excludes test code from the bundle).
- Fixed the approuter `welcomeFile` (`/cap_try/webapp/index.html` → `/cap_try/index.html`)
  to match the built app layout, and the app `xs-app.json` backend route (`/odata/` → `/shop/`).

## Undeploy (clean up trial resources)

```powershell
cf undeploy shop-cart --delete-services --delete-service-keys
```
