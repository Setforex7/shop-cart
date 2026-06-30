import QUnit from "sap/ui/thirdparty/qunit-2";
import DialogHandler from "cap_try_ts/controller/DialogHandler";
import type BaseController from "cap_try_ts/controller/BaseController";

// DialogHandler extends sap.ui.base.Object and exposes only private ("_"-prefixed)
// methods. Per the spec, no public method warrants its own QUnit.test, so the public
// surface under test is the constructor / instantiation contract.
//
// NOTE: The bundled "sap/ui/thirdparty/sinon" module ships no TypeScript type
// declarations (TS2307), and this test does not actually stub anything — the former
// sandbox was a no-op. It is therefore removed rather than worked around.
QUnit.module("DialogHandler", {
	beforeEach: function (this: any) {
		// Minimal stub of BaseController. The constructor only stores this reference;
		// no SAPUI5 controls are instantiated here, so nothing needs destroying beyond
		// the handler itself.
		this.oControllerStub = {
			getView: function () { return null; },
			byId: function () { return null; },
			getModel: function () { return null; },
			getOwnerComponent: function () { return null; }
		} as unknown as BaseController;

		this.oDialogHandler = new DialogHandler(this.oControllerStub);
	},
	afterEach: function (this: any) {
		if (this.oDialogHandler && typeof this.oDialogHandler.destroy === "function") {
			this.oDialogHandler.destroy();
		}
		this.oDialogHandler = null;
	}
});

QUnit.test("constructor creates a DialogHandler instance", function (this: any, assert) {
	assert.ok(this.oDialogHandler, "DialogHandler instance is truthy");
	assert.ok(this.oDialogHandler instanceof DialogHandler, "Instance is a DialogHandler");
	assert.strictEqual(
		typeof this.oDialogHandler.destroy,
		"function",
		"DialogHandler inherits the BaseObject lifecycle (destroy)"
	);
});
