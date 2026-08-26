import App from "cap_try_ts/controller/App.controller";

QUnit.module("App controller", {
    beforeEach: function (this: { oController: App }) {
        this.oController = new App("appController");
    },
    afterEach: function (this: { oController: App }) {
        if (this.oController) {
            this.oController.destroy();
        }
        this.oController = null as unknown as App;
    }
});

QUnit.test("Should instantiate the App controller", function (this: { oController: App }, assert: Assert) {
    assert.ok(this.oController instanceof App, "The controller under test is an App instance");
});

QUnit.test("onInit should be a callable function", function (this: { oController: App }, assert: Assert) {
    assert.strictEqual(typeof this.oController.onInit, "function", "onInit is defined as a function");
});

QUnit.test("onInit should run without errors and return undefined", function (this: { oController: App }, assert: Assert) {
    const vResult = this.oController.onInit();

    assert.strictEqual(vResult, undefined, "onInit returns undefined");
    assert.ok(this.oController instanceof App, "The controller is still usable after onInit");
});
