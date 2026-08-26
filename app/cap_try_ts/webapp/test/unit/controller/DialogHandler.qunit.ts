import DialogHandler from "cap_try_ts/controller/DialogHandler";
import BaseObject from "sap/ui/base/Object";

let oControllerStub: any;
let oDialogHandler: DialogHandler;

QUnit.module("cap_try_ts.controller.DialogHandler", {
    beforeEach: function () {
        oControllerStub = {};
        oDialogHandler = new DialogHandler(oControllerStub);
    },
    afterEach: function () {
        oDialogHandler = undefined as unknown as DialogHandler;
        oControllerStub = undefined;
    }
});

QUnit.test("Constructor: should create an instance of DialogHandler", function (assert) {
    assert.ok(oDialogHandler instanceof DialogHandler, "The created object is an instance of DialogHandler");
});

QUnit.test("Constructor: should create an instance of sap.ui.base.Object", function (assert) {
    assert.ok(oDialogHandler instanceof BaseObject, "DialogHandler extends sap.ui.base.Object");
});

QUnit.test("Constructor: should store the given controller reference internally", function (assert) {
    const oAny = oDialogHandler as unknown as { _oController: unknown };
    assert.strictEqual(oAny._oController, oControllerStub, "The controller instance passed to the constructor is stored on the instance");
});

QUnit.test("Constructor: should initialize fragment and dialog references as undefined", function (assert) {
    const oAny = oDialogHandler as unknown as {
        _oCompaniesFragment: unknown;
        _oCartsFragment: unknown;
        _dDialogCart: unknown;
        _dDialogAddProduct: unknown;
        _dDialogEditProduct: unknown;
    };

    assert.strictEqual(oAny._oCompaniesFragment, undefined, "_oCompaniesFragment starts out undefined");
    assert.strictEqual(oAny._oCartsFragment, undefined, "_oCartsFragment starts out undefined");
    assert.strictEqual(oAny._dDialogCart, undefined, "_dDialogCart starts out undefined");
    assert.strictEqual(oAny._dDialogAddProduct, undefined, "_dDialogAddProduct starts out undefined");
    assert.strictEqual(oAny._dDialogEditProduct, undefined, "_dDialogEditProduct starts out undefined");
});

QUnit.test("isA: should identify the instance as a sap.ui.base.Object", function (assert) {
    assert.strictEqual(oDialogHandler.isA("sap.ui.base.Object"), true, "isA reports the instance as a sap.ui.base.Object");
});

QUnit.test("isA: should return false for an unrelated type name", function (assert) {
    assert.strictEqual(oDialogHandler.isA("sap.ui.core.mvc.Controller"), false, "isA reports false for an unrelated type name");
});

QUnit.test("getMetadata: should return a metadata object for the instance", function (assert) {
    const oMetadata = oDialogHandler.getMetadata();
    assert.ok(oMetadata, "getMetadata returns a truthy metadata object");
});

QUnit.test("getInterface: should return a facade object for the instance", function (assert) {
    const oInterface = oDialogHandler.getInterface();
    assert.ok(oInterface, "getInterface returns a truthy facade object");
});
