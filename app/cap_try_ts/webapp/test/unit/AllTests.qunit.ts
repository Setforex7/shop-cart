// Smoke test — proves the karma + karma-ui5 + QUnit harness is wired up for the
// TypeScript app. It also keeps the suite non-empty so the baseline karma probe
// always has a real, passing test to run. The SAPUI5 CLI validator appends the
// tests it generates alongside this one in webapp/test/testsuite.qunit.html.
QUnit.module("cap_try_ts — test harness smoke test");

QUnit.test("karma + karma-ui5 + QUnit are wired up", (assert) => {
    assert.ok(true, "the test harness runs");
});

// Mark this file as a module so ui5-tooling-transpile wraps it in sap.ui.define.
export {};
