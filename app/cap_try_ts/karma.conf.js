// Karma configuration for cap_try_ts (TypeScript replica of cap_try).
//
// Identical wiring to the JavaScript app: karma-ui5 runs in its default "html"
// mode, discovering tests through webapp/test/testsuite.qunit.html — the
// sap.ui.require([...]) module-id list inside it.
//
// TypeScript note: karma-ui5 builds its dev server from this project's
// ui5.yaml, whose `ui5-tooling-transpile-middleware` transpiles webapp/**/*.ts
// (including the test modules) to JavaScript on the fly. No extra Karma
// preprocessor is required — the requested *.qunit module ids resolve to the
// transpiled output transparently.
module.exports = function (config) {
  config.set({
    // karma-ui5 wires UI5 + QUnit together. 'ui5' must be the ONLY framework
    // entry — listing 'qunit' here is rejected by karma-ui5.
    frameworks: ["ui5"],

    // Where karma-ui5 fetches the UI5 runtime + the QUnit test resources from.
    // Must be the OpenUI5 CDN: the SAPUI5 CDN (sapui5.hana.ondemand.com) serves
    // the runtime for app delivery but NOT the test resources
    // (sap/ui/thirdparty/qunit-2.js, sap/ui/qunit/qunit-junit.js — both 404),
    // so QUnit never loads. OpenUI5 ships every control cap_try_ts uses; for
    // controller unit tests the OpenUI5/SAPUI5 distinction is irrelevant.
    ui5: {
      url: "https://sdk.openui5.org"
    },

    // Headless Chrome — no visible window. Requires karma-chrome-launcher
    // (installed) and a Chrome/Chromium on the machine.
    browsers: ["ChromeHeadless"],

    reporters: ["progress"],

    // THE critical lines. singleRun: true makes karma run the suite once and
    // EXIT. Without it karma defaults to singleRun: false + autoWatch: true and
    // sits in watch mode forever.
    singleRun: true,
    autoWatch: false
  });
};
