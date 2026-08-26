import BaseController from "cap_try_ts/controller/BaseController";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations; the UI5 loader resolves this module at runtime.
import sinon from "sap/ui/thirdparty/sinon";
import Menu from "sap/m/Menu";

let oController: BaseController;
let oSandbox: any;
let oSourceControl: any;

QUnit.module("BaseController", {
    beforeEach: function () {
        oController = new BaseController("BaseController");
        oSandbox = sinon.sandbox.create();
        oSourceControl = {};
    },
    afterEach: function () {
        const oExistingMenu = (oController as any)._oGlobalMenu;
        if (oExistingMenu && typeof oExistingMenu.destroy === "function") {
            oExistingMenu.destroy();
        }
        oSandbox.restore();
    }
});

QUnit.test("getRouter returns the router instance stored on the controller", function (assert) {
    const oFakeRouter: any = { navTo: function () { /* noop */ } };
    (oController as any)._oRouter = oFakeRouter;

    assert.strictEqual(oController.getRouter(), oFakeRouter, "getRouter returns the exact router reference set on the controller");
});

QUnit.test("getDialogHandler returns the dialog handler instance stored on the controller", function (assert) {
    const oFakeDialogHandler: any = { openDialog: function () { /* noop */ } };
    (oController as any)._oDialogHandler = oFakeDialogHandler;

    assert.strictEqual(oController.getDialogHandler(), oFakeDialogHandler, "getDialogHandler returns the exact dialog handler reference set on the controller");
});

QUnit.test("getI18n returns the resource bundle instance stored on the controller", function (assert) {
    const oFakeBundle: any = { getText: function (sKey: string) { return sKey; } };
    (oController as any)._i18n = oFakeBundle;

    assert.strictEqual(oController.getI18n(), oFakeBundle, "getI18n returns the exact resource bundle reference set on the controller");
});

QUnit.test("getI18nText delegates to the resource bundle's getText with the given key and parameters", function (assert) {
    const oGetTextStub = sinon.stub().returns("translated text");
    (oController as any)._i18n = { getText: oGetTextStub };

    const sResult = oController.getI18nText("some_key", ["param1"]);

    assert.strictEqual(sResult, "translated text", "getI18nText returns the value produced by the resource bundle");
    assert.ok(oGetTextStub.calledWith("some_key", ["param1"]), "the resource bundle's getText is called with the key and parameters passed through");
});

QUnit.test("getModel retrieves the model for the given alias from the owner component", function (assert) {
    const oFakeModel: any = { refresh: function () { /* noop */ } };
    const oGetModelStub = sinon.stub();
    oGetModelStub.withArgs("globalModel").returns(oFakeModel);
    oSandbox.stub(oController, "getOwnerComponent").returns({ getModel: oGetModelStub });

    const oResult = oController.getModel("globalModel");

    assert.strictEqual(oResult, oFakeModel, "getModel returns the model instance provided by the owner component");
    assert.ok(oGetModelStub.calledWith("globalModel"), "the owner component's getModel is called with the requested alias");
});

QUnit.test("getModel retrieves the default model when no alias is given", function (assert) {
    const oFakeModel: any = {};
    const oGetModelStub = sinon.stub().returns(oFakeModel);
    oSandbox.stub(oController, "getOwnerComponent").returns({ getModel: oGetModelStub });

    const oResult = oController.getModel();

    assert.strictEqual(oResult, oFakeModel, "getModel returns the default model instance from the owner component");
    assert.ok(oGetModelStub.calledWith(undefined), "the owner component's getModel is called without an alias");
});

QUnit.test("setProp sets a property value on the model identified by the given alias", function (assert) {
    const oSetPropertyStub = sinon.stub();
    const oGetModelStub = sinon.stub();
    oGetModelStub.withArgs("globalModel").returns({ setProperty: oSetPropertyStub });
    oSandbox.stub(oController, "getOwnerComponent").returns({ getModel: oGetModelStub });

    oController.setProp("globalModel", "/selectedCompany", { ID: "1" });

    assert.ok(oSetPropertyStub.calledWith("/selectedCompany", { ID: "1" }), "setProperty is called on the named model with the given path and value");
});

QUnit.test("getProp reads a property value from the model identified by the given alias", function (assert) {
    const oGetPropertyStub = sinon.stub();
    oGetPropertyStub.withArgs("/selectedCompany").returns({ ID: "1" });
    const oGetModelStub = sinon.stub();
    oGetModelStub.withArgs("globalModel").returns({ getProperty: oGetPropertyStub });
    oSandbox.stub(oController, "getOwnerComponent").returns({ getModel: oGetModelStub });

    const oResult = oController.getProp("globalModel", "/selectedCompany");

    assert.deepEqual(oResult, { ID: "1" }, "getProp returns the value read from the named model");
    assert.ok(oGetPropertyStub.calledWith("/selectedCompany"), "getProperty is called with the given path");
});

QUnit.test("initializeMenu creates the global menu once with three items and opens it at the event source", function (assert) {
    const oGetI18nTextStub = oSandbox.stub(oController, "getI18nText");
    oGetI18nTextStub.withArgs("menu_start").returns("Start");
    oGetI18nTextStub.withArgs("menu_reports").returns("Reports");
    oGetI18nTextStub.withArgs("menu_settings").returns("Settings");
    oSandbox.stub(oController, "getProp").withArgs("globalModel", "/userInfo/roles").returns(["admin"]);
    const oOpenByStub = oSandbox.stub(Menu.prototype, "openBy");
    const oEvent: any = { getSource: function () { return oSourceControl; } };

    oController.initializeMenu(oEvent);

    const oMenu = (oController as any)._oGlobalMenu;
    assert.ok(oMenu, "a menu instance is created and cached on the controller");
    assert.strictEqual(oMenu.getItems().length, 3, "the menu is created with three items");
    assert.ok(oOpenByStub.calledWith(oSourceControl), "the menu is opened by the control that triggered the event");

    oController.initializeMenu(oEvent);

    assert.strictEqual((oController as any)._oGlobalMenu, oMenu, "a second call reuses the cached menu instance instead of creating a new one");
});

QUnit.test("initializeMenu hides the settings item for a user without the admin role", function (assert) {
    const oGetI18nTextStub = oSandbox.stub(oController, "getI18nText");
    oGetI18nTextStub.withArgs("menu_start").returns("Start");
    oGetI18nTextStub.withArgs("menu_reports").returns("Reports");
    oGetI18nTextStub.withArgs("menu_settings").returns("Settings");
    oSandbox.stub(oController, "getProp").withArgs("globalModel", "/userInfo/roles").returns([]);
    oSandbox.stub(Menu.prototype, "openBy");
    const oEvent: any = { getSource: function () { return oSourceControl; } };

    oController.initializeMenu(oEvent);

    const oMenu = (oController as any)._oGlobalMenu;
    const oSettingsItem = oMenu.getItems()[2];
    assert.notOk(oSettingsItem.getVisible(), "the settings menu item is hidden when the user has no admin role");
});

QUnit.test("toggleMessageView delegates to the message service with the triggering event", function (assert) {
    const oToggleStub = sinon.stub();
    (oController as any)._messageService = { toggleMessageView: oToggleStub };
    const oEvent: any = { getSource: function () { return oSourceControl; } };

    oController.toggleMessageView(oEvent);

    assert.ok(oToggleStub.calledWith(oEvent), "the message service's toggleMessageView is called with the triggering event");
});
