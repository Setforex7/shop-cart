import BaseController from "cap_try_ts/controller/BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import Menu from "sap/m/Menu";
import Button from "sap/m/Button";
import Event from "sap/ui/base/Event";
// @ts-ignore - sap/ui/thirdparty/sinon ships no type declarations
import sinon from "sap/ui/thirdparty/sinon";

let oSandbox: any;
let oController: BaseController;
let oGlobalModel: JSONModel;
let oDefaultModel: JSONModel;

QUnit.module("BaseController", {
    beforeEach: function () {
        oSandbox = (sinon as any).sandbox.create();
        oController = new BaseController("cap_try_ts.controller.BaseController");

        oGlobalModel = new JSONModel({
            userInfo: { id: "alice", roles: ["admin"] },
            selectedCompany: {},
            selectedCart: {}
        });
        oDefaultModel = new JSONModel({});

        const oComponent = {
            getModel: function (sAlias?: string) {
                return sAlias === "globalModel" ? oGlobalModel : oDefaultModel;
            }
        };
        oSandbox.stub(oController, "getOwnerComponent").returns(oComponent);
    },
    afterEach: function () {
        oSandbox.restore();
        const oMenu = (oController as any)._oGlobalMenu as Menu | undefined;
        if (oMenu) {
            oMenu.destroy();
        }
        oController.destroy();
        oGlobalModel.destroy();
        oDefaultModel.destroy();
    }
});

QUnit.test("getRouter returns the stored router instance", function (assert) {
    const oFakeRouter = { navTo: function () { /* noop */ } };
    (oController as any)._oRouter = oFakeRouter;
    assert.strictEqual(oController.getRouter() as unknown, oFakeRouter, "returns the router set during load");
});

QUnit.test("getDialogHandler returns the stored dialog handler instance", function (assert) {
    const oFakeDialogHandler = { id: "dialog-handler" };
    (oController as any)._oDialogHandler = oFakeDialogHandler;
    assert.strictEqual(oController.getDialogHandler() as unknown, oFakeDialogHandler, "returns the dialog handler");
});

QUnit.test("getI18n returns the stored resource bundle", function (assert) {
    const oBundle = { getText: function () { return ""; } };
    (oController as any)._i18n = oBundle;
    assert.strictEqual(oController.getI18n() as unknown, oBundle, "returns the resource bundle");
});

QUnit.test("getI18nText delegates to the resource bundle getText", function (assert) {
    (oController as any)._i18n = {
        getText: function (sKey: string, aParams?: unknown[]) {
            return "text:" + sKey + ":" + (aParams ? aParams.join(",") : "");
        }
    };
    assert.strictEqual(oController.getI18nText("hello"), "text:hello:", "returns the translated text");
    assert.strictEqual(oController.getI18nText("greet", ["a", "b"]), "text:greet:a,b", "forwards parameters to getText");
});

QUnit.test("getModel resolves models from the owner component by alias", function (assert) {
    assert.strictEqual(oController.getModel("globalModel"), oGlobalModel, "returns the aliased model");
    assert.strictEqual(oController.getModel(), oDefaultModel, "returns the default model when no alias is given");
});

QUnit.test("setProp writes a property on the aliased JSON model", function (assert) {
    oController.setProp("globalModel", "/selectedCompany", { ID: "C1" });
    assert.deepEqual(oGlobalModel.getProperty("/selectedCompany"), { ID: "C1" }, "the property is written to the model");
});

QUnit.test("getProp reads a property from the aliased JSON model", function (assert) {
    assert.strictEqual(oController.getProp("globalModel", "/userInfo/id"), "alice", "reads a scalar property");
    assert.deepEqual(oController.getProp("globalModel", "/userInfo/roles"), ["admin"], "reads an array property");
});

QUnit.test("initializeMenu builds the global menu and opens it by the event source", function (assert) {
    (oController as any)._i18n = {
        getText: function (sKey: string) { return sKey; }
    };
    (oController as any)._oRouter = { navTo: function () { /* noop */ } };

    const oOpenByStub = oSandbox.stub(Menu.prototype, "openBy");
    const oButton = new Button();
    const oEvent = { getSource: function () { return oButton; } } as unknown as Event;

    oController.initializeMenu(oEvent);

    const oMenu = (oController as any)._oGlobalMenu as Menu;
    assert.ok(oMenu instanceof Menu, "a Menu instance is created and stored");
    assert.strictEqual(oMenu.getItems().length, 3, "the menu contains three menu items");
    assert.ok(oOpenByStub.calledOnce, "openBy is invoked once");
    assert.strictEqual(oOpenByStub.firstCall.args[0], oButton, "openBy is invoked with the event source control");

    oButton.destroy();
});

QUnit.test("toggleMessageView delegates to the message service", function (assert) {
    const oToggleSpy = oSandbox.spy();
    (oController as any)._messageService = {
        toggleMessageView: oToggleSpy,
        addMessage: function () { /* noop */ },
        deleteMessages: function () { /* noop */ }
    };
    const oEvent = {} as Event;

    oController.toggleMessageView(oEvent);

    assert.ok(oToggleSpy.calledOnce, "the message service toggleMessageView is called once");
    assert.strictEqual(oToggleSpy.firstCall.args[0], oEvent, "the event is forwarded to the message service");
});
