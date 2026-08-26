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

    // Boot the UI5 dev server from ui5-karma.yaml instead of proxying a CDN
    // directly (`ui5: { url }`). The url mode short-circuits the ui5.yaml
    // middleware chain entirely (karma-ui5 framework.js: `if (config.ui5.url)`
    // installs only an http-proxy), so ui5-tooling-transpile never ran and
    // every webapp/test/**/*.qunit.js request 404'd — the suite could not even
    // load. ui5-karma.yaml keeps the transpile middleware (TS -> JS on the
    // fly) and proxies /resources + /test-resources to the OpenUI5 CDN, which
    // (unlike the SAPUI5 CDN) serves qunit-2.js and qunit-junit.js.
    ui5: {
      configPath: "ui5-karma.yaml"
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
