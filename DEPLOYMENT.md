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

All installed and verified on this machine (2026-06-12):

```powershell
cf version          # cf 8.14.x
cf plugins          # multiapps 3.11.x (provides `cf deploy`)
mbt --version       # 1.2.47
make --version      # GNU Make 4.4.1
```

> **Why make?** `mbt build` generates a Makefile and runs `make` to orchestrate
> the per-module builds. Without it you'll see `exec: "make": executable file
> not found`.

---

## 1. BTP subaccount entitlements (one-time)

**What you create by hand vs. what the deploy creates.** Only **one** thing is a
manual prerequisite: the **SAP HANA Cloud database** (step 1b). It is *not* part
of the MTA. Everything else the app needs at the service layer — the HDI container
(your schema), XSUAA, and both HTML5-repo services — is created automatically by
`cf deploy` from `mta.yaml`'s `resources`. You pre-create none of those four.

In the BTP cockpit for the target subaccount, make sure these entitlements are
assigned to your space:

- **Cloud Foundry Runtime** (~1.25 GB free needed: `srv` ~1 GB + approuter 256 MB)
- **SAP HANA Cloud** — to create the database instance itself (step 1b)
- **SAP HANA Schemas & HDI Containers** — service `hana`, plan `hdi-shared`
  (the MTA's `shop-cart-db` uses this to make the app's container *inside* the DB)
- **HTML5 Application Repository** — plans `app-host` and `app-runtime`
- **Authorization & Trust Management (XSUAA)** — plan `application`

### Trial-specific ⚠️ (this is your target)
You're deploying to a **BTP trial** subaccount. Trial has quirks the enterprise
landscape doesn't:

- **One free HANA Cloud instance, and it auto-stops every night.** Before each
  deploy — and before each time you open the app — go to the cockpit and
  **restart the HANA Cloud instance** (SAP HANA Cloud → your instance → Start).
  It takes a few minutes to come up. If it's stopped, the DB deployer and `srv`
  fail with connection errors.
- **You must create that HANA instance once** if you don't have one yet — see
  step 1b. Trial allows exactly one.
- **Switch your CF target to the trial endpoint** (step 2). You may still be
  logged into the enterprise org (`api.cf.eu10.hana.ondemand.com`). The trial API
  is region-specific — e.g. `https://api.cf.us10-001.hana.ondemand.com`,
  `https://api.cf.eu10-004.hana.ondemand.com`, or `https://api.cf.ap21.hana.ondemand.com`.
  Copy the exact value from your trial cockpit (subaccount → Overview → "Cloud
  Foundry Environment → API Endpoint").
- **Memory quota is tight on trial** (≈4 GB). This app needs ~1.25 GB
  (`srv` ~1 GB + approuter 256 MB). Fine on a fresh trial; if you hit a quota
  error, stop other apps first (`cf stop <app>`).

### 1b. Create the HANA Cloud instance (trial, one-time)
If `cf services` (step 2) shows no HANA instance:

1. Cockpit → your trial subaccount → **SAP HANA Cloud** (a.k.a. SAP HANA Cloud Central).
2. **Create** → *SAP HANA Cloud, SAP HANA database*.
3. Pick your trial CF space, set an admin (DBADMIN) password, and under
   connections allow access from **all IP addresses** (trial convenience).
4. Create, then wait until status is **RUNNING** (~10–15 min the first time).

Verify the container plan the MTA needs is now available in this space:

```powershell
cf marketplace -e hana     # must list the `hdi-shared` plan
cf services                # your HANA Cloud DB should appear here
```

If `hana` isn't in the marketplace, the DB isn't running/mapped to this space, or
the **SAP HANA Schemas & HDI Containers** entitlement is missing (add it in
cockpit → Entitlements, then retry). Note: the old `hanatrial` service is
deprecated — current HANA Cloud trials use the `hana` service / `hdi-shared` plan,
which is exactly what `mta.yaml` declares.

> The MTA's `shop-cart-db` resource (service `hana`, plan `hdi-shared`)
> automatically creates an **HDI container (schema + technical user) inside this
> database** during deploy — you only provision the database itself. Because trial
> has exactly one HANA Cloud DB, the container auto-binds to it; no `database_id`
> parameter is needed. You do **not** create the HDI container by hand.

---

## 2. Log in and target the trial space

```powershell
# Point the CLI at your TRIAL API endpoint (from the trial cockpit overview)
cf api https://api.cf.us10-001.hana.ondemand.com   # <-- replace with YOUR trial endpoint
cf login --sso                                      # open the shown URL, paste the one-time code

# Trial org is your trial subdomain; the space defaults to "dev"
cf target -o <your-trial-org> -s dev
cf target                                           # confirm org + space are set
```

Confirm the HANA instance is present and **RUNNING** before deploying:

```powershell
cf services     # expect a HANA Cloud instance, state "create succeeded" / running
```

If it's stopped, restart it in the cockpit (trial auto-stops nightly). If it
doesn't exist yet, do **step 1b** first.

---

## 3. Build the archive

⚠️ **On this machine, do NOT run `mbt build` from the normal path.** GNU make
cannot spawn `mbt.exe` from a path containing the accented `á` in
`C:\Users\Tomás Rocha` (CreateProcess fails). Use the ASCII 8.3 short paths
instead — verified working:

```powershell
Set-Location "C:\Users\TOMSRO~1\DOCUME~1\SHOP-C~1"
& "C:\Users\TOMSRO~1\AppData\Roaming\npm\NODE_M~1\mbt\UNPACK~1\mbt.exe" build -p=cf
```

This runs `cds build --production` + each module build (~5 min) and produces:

```
mta_archives/shop-cart_1.0.0.mtar
```

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
| `mbt build` dies with `CreateProcess(...Tomás...) failed` / `process_begin` errors | Non-ASCII char (`á`) in the Windows user path; GNU make can't spawn `mbt.exe` from it | Build via **8.3 short paths** (see step 3) — both the working directory and the `mbt.exe` path must be the ASCII short form |
| `srv` crash-loops with `Cannot find module '@sap/hana-client'` | Native HANA driver not installed (it's an *optional* peer of `@cap-js/hana`) | Ensure `@sap/hana-client` is in `dependencies` (it is), `npm install`, rebuild & redeploy |
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

- Added the full HANA stack to `package.json`: the **`@cap-js/hana`** CAP plugin
  *and* the **`@sap/hana-client`** native driver. `@cap-js/hana` declares the driver
  only as an *optional* peer dependency, so `npm ci` silently skips it — without
  `@sap/hana-client` listed explicitly, `shop-cart-srv` deploys and starts fine but
  **crashes the instant it touches the database** (`Cannot find module
  '@sap/hana-client'`). Both are now in `dependencies`.
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
