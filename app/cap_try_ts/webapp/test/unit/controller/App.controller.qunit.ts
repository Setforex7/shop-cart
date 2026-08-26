import App from "cap_try_ts/controller/App.controller";

QUnit.module("App controller", {
    beforeEach: function (this: { oController: App }) {
        this.oController = new App("appController");
    },
    afterEach: function (this: { oController: App }) {
        this.oController.destroy();
        this.oController = null as unknown as App;
    }
});

QUnit.test("Should instantiate the controller", function (this: { oController: App }, assert: Assert) {
    assert.ok(this.oController, "The controller instance was created");
    assert.strictEqual(typeof this.oController.onInit, "function", "onInit is a function");
});

QUnit.test("onInit should execute without errors", function (this: { oController: App }, assert: Assert) {
    let bThrown = false;

    try {
        this.oController.onInit();
    } catch (oError) {
        bThrown = true;
    }

    assert.strictEqual(bThrown, false, "onInit did not throw");
    assert.strictEqual(this.oController.onInit(), undefined, "onInit returns undefined");
});
