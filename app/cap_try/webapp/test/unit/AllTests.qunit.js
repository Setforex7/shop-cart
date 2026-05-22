sap.ui.define([], function () {
	"use strict";

	// Smoke test — proves the karma + karma-ui5 + QUnit harness is wired up.
	// It also keeps the suite non-empty so the baseline karma probe always has
	// a real, passing test to run. `sapui5-validate generate` appends the tests
	// it generates alongside this one in webapp/test/testsuite.qunit.html.
	QUnit.module("cap_try — test harness smoke test");

	QUnit.test("karma + karma-ui5 + QUnit are wired up", function (assert) {
		assert.ok(true, "the test harness runs");
	});
});
