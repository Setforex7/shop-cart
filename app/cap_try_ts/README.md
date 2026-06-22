## Application Details

TypeScript replica of the `cap_try` SAP Fiori application. Behaviour is identical
to the JavaScript original (`app/cap_try`); only the implementation language and
the namespace/app-id (`cap_try` → `cap_try_ts`) differ. It exists as a TypeScript
test fixture for the SAPUI5 CLI validator.

|               |
| ------------- |
|**App Generator**<br>@sap/generator-fiori-freestyle (manually ported to TypeScript)|
|**Template Used**<br>simple|
|**Service Type**<br>Local Cap|
|**Module Name**<br>cap_try_ts|
|**Application Title**<br>cap_try_ts|
|**UI5 Theme**<br>sap_horizon_dark|
|**UI5 Version**<br>1.136.2|
|**Enable TypeScript**<br>True|

### Toolchain

- **TypeScript → JavaScript** via [`ui5-tooling-transpile`](https://www.npmjs.com/package/ui5-tooling-transpile)
  (build task + dev-server/karma middleware). Configured in `ui5.yaml` /
  `ui5-deploy.yaml`.
- **Type checking:** `npm run ts-typecheck` (`tsc --noEmit`, types from `@sapui5/types`).
- **Lint:** `npm run lint` (`ui5lint`).
- **Unit tests:** `npm test` (karma + karma-ui5, headless Chrome). The default
  scaffold ships only the harness smoke test (`webapp/test/unit/AllTests.qunit.ts`);
  the validator generates the per-module tests.

### Running

```sh
npm install
npm start          # ui5 serve with on-the-fly transpilation
```

Then open `http://localhost:8080/index.html` (requires the CAP backend serving
`/shop/` — start it from the repository root with `npm run watch-cap_try`).
