/*global QUnit*/
sap.ui.define([
	"cap_try/controller/App.controller",
	"sap/ui/thirdparty/sinon"
], function (AppController, sinon) {
	"use strict";

	QUnit.module("cap_try.controller.App", {
		beforeEach: function () {
			this.sandbox = sinon.sandbox.create();
			this.oController = new AppController();
		},
		afterEach: function () {
			this.sandbox.restore();
			if (this.oController) {
				this.oController.destroy();
				this.oController = null;
			}
		}
	});

	QUnit.test("controller is instantiated correctly", function (assert) {
		assert.ok(this.oController, "controller instance was created");
		assert.ok(
			this.oController.isA("cap_try.controller.App"),
			"controller is of type cap_try.controller.App"
		);
	});

	QUnit.test("onInit: exists and executes without throwing", function (assert) {
		assert.strictEqual(
			typeof this.oController.onInit,
			"function",
			"onInit is a function on the controller"
		);

		var vResult;
		var bThrew = false;
		try {
			vResult = this.oController.onInit();
		} catch (e) {
			bThrew = true;
		}

		assert.strictEqual(bThrew, false, "onInit does not throw when invoked");
		assert.strictEqual(vResult, undefined, "onInit returns undefined (no return value)");
	});
});
