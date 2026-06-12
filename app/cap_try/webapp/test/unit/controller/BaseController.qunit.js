sap.ui.define([
    "cap_try/controller/BaseController",
    "sap/m/Menu",
    "sap/m/MenuItem",
    "sap/ui/thirdparty/sinon"
], function (BaseController, Menu, MenuItem, sinon) {
    "use strict";

    QUnit.module("cap_try.controller.BaseController", {
        beforeEach: function () {
            this.sandbox = sinon.sandbox.create();
            this.oController = new BaseController();
        },
        afterEach: function () {
            if (this.oController._oGlobalMenu) {
                this.oController._oGlobalMenu.destroy();
                this.oController._oGlobalMenu = null;
            }
            this.oController.destroy();
            this.sandbox.restore();
        }
    });

    QUnit.test("getRouter returns the router stored on the controller", function (assert) {
        var oRouter = { navTo: function () {} };
        this.oController._oRouter = oRouter;
        assert.strictEqual(this.oController.getRouter(), oRouter, "getRouter returns the internally stored router instance");
    });

    QUnit.test("getDialogHandler returns the dialog handler stored on the controller", function (assert) {
        var oDialogHandler = { open: function () {} };
        this.oController._oDialogHandler = oDialogHandler;
        assert.strictEqual(this.oController.getDialogHandler(), oDialogHandler, "getDialogHandler returns the internally stored dialog handler");
    });

    QUnit.test("getI18n returns the resource bundle stored on the controller", function (assert) {
        var oBundle = { getText: function () {} };
        this.oController._i18n = oBundle;
        assert.strictEqual(this.oController.getI18n(), oBundle, "getI18n returns the internally stored resource bundle");
    });

    QUnit.test("getI18nText delegates to the resource bundle with key and parameters", function (assert) {
        var oGetText = this.sandbox.stub().returns("translated text");
        this.oController._i18n = { getText: oGetText };

        var sResult = this.oController.getI18nText("some_key", ["p1", "p2"]);

        assert.strictEqual(sResult, "translated text", "the bundle result is returned unchanged");
        assert.ok(oGetText.calledOnce, "getText is called exactly once");
        assert.ok(oGetText.calledWithExactly("some_key", ["p1", "p2"]), "key and parameters are forwarded to the bundle");
    });

    QUnit.test("getModel resolves the model from the owner component", function (assert) {
        var oModel = { id: "mockModel" };
        var oGetModel = this.sandbox.stub().returns(oModel);
        this.sandbox.stub(this.oController, "getOwnerComponent").returns({ getModel: oGetModel });

        var oResult = this.oController.getModel("globalModel");

        assert.strictEqual(oResult, oModel, "the model returned by the owner component is passed through");
        assert.ok(oGetModel.calledWith("globalModel"), "the alias is forwarded to the owner component");

        this.oController.getModel();
        assert.ok(oGetModel.calledWith(undefined), "omitting the alias requests the default (unnamed) model");
        assert.strictEqual(oGetModel.callCount, 2, "the owner component is consulted on every call");
    });

    QUnit.test("setProp writes a property on the named model", function (assert) {
        var oSetProperty = this.sandbox.stub();
        var oGetModel = this.sandbox.stub().returns({ setProperty: oSetProperty });
        this.sandbox.stub(this.oController, "getOwnerComponent").returns({ getModel: oGetModel });

        this.oController.setProp("globalModel", "/selectedCompany", { id: 1 });

        assert.ok(oGetModel.calledWith("globalModel"), "the model is resolved by its alias");
        assert.ok(oSetProperty.calledOnce, "setProperty is called exactly once");
        assert.strictEqual(oSetProperty.firstCall.args[0], "/selectedCompany", "the property path is forwarded");
        assert.deepEqual(oSetProperty.firstCall.args[1], { id: 1 }, "the value is forwarded");
    });

    QUnit.test("getProp reads a property from the named model", function (assert) {
        var oGetProperty = this.sandbox.stub().returns(["admin"]);
        var oGetModel = this.sandbox.stub().returns({ getProperty: oGetProperty });
        this.sandbox.stub(this.oController, "getOwnerComponent").returns({ getModel: oGetModel });

        var uValue = this.oController.getProp("globalModel", "/userInfo/roles");

        assert.deepEqual(uValue, ["admin"], "the property value from the model is returned");
        assert.ok(oGetModel.calledWith("globalModel"), "the model is resolved by its alias");
        assert.ok(oGetProperty.calledWithExactly("/userInfo/roles"), "the property path is forwarded");
    });

    QUnit.test("initializeMenu creates the menu once and opens it by the event source", function (assert) {
        var oOpenBy = this.sandbox.stub(Menu.prototype, "openBy");
        this.sandbox.stub(this.oController, "getI18nText").returnsArg(0);
        this.sandbox.stub(this.oController, "getProp").withArgs("globalModel", "/userInfo/roles").returns(["admin"]);

        var oSource = { id: "sourceControl" };
        var oEvent = { getSource: function () { return oSource; } };

        this.oController.initializeMenu(oEvent);

        var oMenu = this.oController._oGlobalMenu;
        assert.ok(oMenu instanceof Menu, "a sap.m.Menu instance is created and stored on the controller");
        assert.strictEqual(oMenu.getItems().length, 3, "the menu contains three items");
        assert.strictEqual(oMenu.getItems()[0].getText(), "menu_start", "the first item uses the start text key");
        assert.strictEqual(oMenu.getItems()[1].getText(), "menu_reports", "the second item uses the reports text key");
        assert.strictEqual(oMenu.getItems()[2].getVisible(), true, "the settings item is visible for an admin user");
        assert.ok(oOpenBy.calledOnce, "the menu is opened once");
        assert.ok(oOpenBy.calledOn(oMenu), "openBy is invoked on the created menu");
        assert.strictEqual(oOpenBy.firstCall.args[0], oSource, "the menu opens by the event source control");

        this.oController.initializeMenu(oEvent);
        assert.strictEqual(this.oController._oGlobalMenu, oMenu, "the menu instance is reused on subsequent calls");
        assert.ok(oOpenBy.calledTwice, "the existing menu is opened again instead of recreating it");
    });

    QUnit.test("initializeMenu hides the settings item for non-admin users", function (assert) {
        this.sandbox.stub(Menu.prototype, "openBy");
        this.sandbox.stub(this.oController, "getI18nText").returnsArg(0);
        this.sandbox.stub(this.oController, "getProp").withArgs("globalModel", "/userInfo/roles").returns(["User"]);

        this.oController.initializeMenu({ getSource: function () { return {}; } });

        assert.strictEqual(this.oController._oGlobalMenu.getItems()[2].getVisible(), false, "the settings item is hidden when the user has no admin role");
    });

    QUnit.test("initializeMenu item selection navigates to the mapped route", function (assert) {
        this.sandbox.stub(Menu.prototype, "openBy");
        this.sandbox.stub(this.oController, "getI18nText").returnsArg(0);
        this.sandbox.stub(this.oController, "getProp").withArgs("globalModel", "/userInfo/roles").returns(["admin"]);
        var oNavTo = this.sandbox.stub();
        this.oController._oRouter = { navTo: oNavTo };

        this.oController.initializeMenu({ getSource: function () { return {}; } });

        var oItem = new MenuItem({ text: "menu_reports" });
        this.oController._oGlobalMenu.fireItemSelected({ item: oItem });

        assert.ok(oNavTo.calledOnce, "navTo is called once for a mapped menu entry");
        assert.ok(oNavTo.calledWithExactly("Reports"), "selecting the reports item navigates to the Reports route");

        var oUnknownItem = new MenuItem({ text: "unknown_entry" });
        this.oController._oGlobalMenu.fireItemSelected({ item: oUnknownItem });
        assert.strictEqual(oNavTo.callCount, 1, "an unmapped menu entry does not trigger navigation");

        oItem.destroy();
        oUnknownItem.destroy();
    });

    QUnit.test("toggleMessageView delegates to the message service", function (assert) {
        var oToggle = this.sandbox.stub();
        this.oController._messageService = { toggleMessageView: oToggle };
        var oEvent = { getSource: function () { return null; } };

        this.oController.toggleMessageView(oEvent);

        assert.ok(oToggle.calledOnce, "the message service is invoked exactly once");
        assert.strictEqual(oToggle.firstCall.args[0], oEvent, "the original event is forwarded to the message service");
    });
});
