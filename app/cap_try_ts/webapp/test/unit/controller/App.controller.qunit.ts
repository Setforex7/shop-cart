import Controller from "sap/ui/core/mvc/Controller";
import App from "cap_try_ts/controller/App.controller";
import QUnit from "sap/ui/thirdparty/qunit-2";

interface TestContext {
	oController: App;
}

QUnit.module("cap_try_ts.controller.App", {
	beforeEach(this: TestContext): void {
		this.oController = new App("App");
	},
	afterEach(this: TestContext): void {
		this.oController.destroy();
	}
});

QUnit.test("It should create the controller instance", function (this: TestContext, assert: Assert): void {
	assert.ok(this.oController, "The controller instance was created");
	assert.ok(this.oController instanceof Controller, "The controller extends sap.ui.core.mvc.Controller");
});

QUnit.test("onInit should run without throwing", function (this: TestContext, assert: Assert): void {
	this.oController.onInit();
	assert.ok(true, "onInit executed successfully");
});
