// @ts-ignore -- sap/ui/thirdparty/sinon ships without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import BaseController from "cap_try_ts/controller/BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import Button from "sap/m/Button";
import View from "sap/ui/core/mvc/View";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

type AnyObject = Record<string, any>;

let oController: BaseController;
let oSandbox: any;
let oGlobalModel: JSONModel;
let oMessageModel: JSONModel;
let oOwnerComponentStub: AnyObject;
let oODataModelStub: AnyObject;
let oRouterStub: AnyObject;
let oViewStub: AnyObject;
let aCreatedControls: Array<{ destroy: () => void }>;

function createODataModelStub(): AnyObject {
	return {
		refresh: sinon.stub(),
		bindContext: sinon.stub(),
		bindList: sinon.stub()
	};
}

function createViewStub(): AnyObject {
	return {
		setBusy: sinon.stub(),
		setModel: sinon.stub(),
		getModel: sinon.stub()
	};
}

function getMenuItems(oMenu: Menu): MenuItem[] {
	return oMenu.getItems() as unknown as MenuItem[];
}

QUnit.module("cap_try_ts.controller.BaseController", {
	beforeEach: function () {
		oSandbox = sinon.sandbox.create();
		aCreatedControls = [];

		oGlobalModel = new JSONModel({
			userInfo: { id: "alice", roles: ["admin"] },
			selectedCompany: { ID: "c-1" },
			selectedCart: { ID: "cart-1" }
		});
		oMessageModel = new JSONModel({ messages: [] });
		aCreatedControls.push(oGlobalModel as unknown as { destroy: () => void });
		aCreatedControls.push(oMessageModel as unknown as { destroy: () => void });

		oODataModelStub = createODataModelStub();
		oViewStub = createViewStub();
		oRouterStub = { navTo: sinon.stub(), getRoute: sinon.stub() };

		const oResourceBundleStub: AnyObject = {
			getText: sinon.stub()
		};
		oResourceBundleStub.getText.returnsArg(0);
		oResourceBundleStub.getText.withArgs("menu_start").returns("Start");
		oResourceBundleStub.getText.withArgs("menu_reports").returns("Reports");
		oResourceBundleStub.getText.withArgs("menu_settings").returns("Settings");

		const oResourceModelStub: AnyObject = {
			getResourceBundle: sinon.stub().returns(oResourceBundleStub)
		};

		const oGetModelStub: AnyObject = sinon.stub();
		oGetModelStub.returns(oODataModelStub);
		oGetModelStub.withArgs(undefined).returns(oODataModelStub);
		oGetModelStub.withArgs("globalModel").returns(oGlobalModel);
		oGetModelStub.withArgs("messageModel").returns(oMessageModel);
		oGetModelStub.withArgs("i18n").returns(oResourceModelStub as unknown as ResourceModel);

		oOwnerComponentStub = {
			getModel: oGetModelStub,
			getRouter: sinon.stub().returns(oRouterStub)
		};

		oController = new BaseController("cap_try_ts.controller.BaseController");
		oSandbox.stub(oController, "getOwnerComponent").returns(oOwnerComponentStub);
		oSandbox.stub(oController, "getView").returns(oViewStub as unknown as View);

		// Wire private collaborators that _onControllerLoad would normally build.
		const oPrivate = oController as unknown as AnyObject;
		oPrivate._i18n = oResourceBundleStub;
		oPrivate._oRouter = oRouterStub;
		oPrivate._oDialogHandler = { open: sinon.stub(), close: sinon.stub() };
		oPrivate._messageService = {
			addMessage: sinon.stub(),
			deleteMessages: sinon.stub(),
			toggleMessageView: sinon.stub()
		};
	},
	afterEach: function () {
		const oPrivate = oController as unknown as AnyObject;
		if (oPrivate._oGlobalMenu) {
			(oPrivate._oGlobalMenu as Menu).destroy();
			oPrivate._oGlobalMenu = undefined;
		}
		aCreatedControls.forEach(function (oControl) {
			if (oControl && typeof oControl.destroy === "function") {
				oControl.destroy();
			}
		});
		aCreatedControls = [];
		oController.destroy();
		oSandbox.restore();
	}
});

QUnit.test("getRouter returns the router resolved from the owner component", function (assert) {
	const oResult = oController.getRouter();

	assert.strictEqual(oResult, oRouterStub as unknown as ReturnType<BaseController["getRouter"]>, "the cached router instance is returned");
});

QUnit.test("getDialogHandler returns the dialog handler instance", function (assert) {
	const oExpected = (oController as unknown as AnyObject)._oDialogHandler;

	assert.strictEqual(oController.getDialogHandler(), oExpected, "the cached dialog handler is returned");
});

QUnit.test("getI18n returns the resource bundle", function (assert) {
	const oBundle = oController.getI18n();

	assert.ok(oBundle, "a resource bundle is returned");
	assert.strictEqual(typeof oBundle.getText, "function", "the returned bundle exposes getText");
});

QUnit.test("getI18nText delegates to the resource bundle", function (assert) {
	const oBundle = oController.getI18n() as unknown as AnyObject;

	assert.strictEqual(oController.getI18nText("menu_start"), "Start", "the translated text is returned");
	assert.strictEqual(oBundle.getText.callCount, 1, "getText was called exactly once");

	const aParameters = ["p1"];
	assert.strictEqual(oController.getI18nText("some_key", aParameters), "some_key", "unknown keys fall back to the key");
	assert.deepEqual(oBundle.getText.getCall(1).args, ["some_key", aParameters], "parameters are forwarded to getText");
});

QUnit.test("getModel returns the default model when no alias is given", function (assert) {
	assert.strictEqual(oController.getModel(), oODataModelStub as unknown as ReturnType<BaseController["getModel"]>, "the default OData model is returned");
});

QUnit.test("getModel returns the named model for an alias", function (assert) {
	assert.strictEqual(oController.getModel("globalModel"), oGlobalModel, "the globalModel is returned for its alias");
	assert.strictEqual(oOwnerComponentStub.getModel.calledWith("globalModel"), true, "the alias is forwarded to the component");
});

QUnit.test("setProp writes a property into the aliased JSON model", function (assert) {
	oController.setProp("globalModel", "/selectedCompany", { ID: "c-99", name: "ACME" });

	assert.deepEqual(oGlobalModel.getProperty("/selectedCompany"), { ID: "c-99", name: "ACME" }, "the property was written to the model");
});

QUnit.test("getProp reads a property from the aliased JSON model", function (assert) {
	assert.strictEqual(oController.getProp("globalModel", "/userInfo/id"), "alice", "the nested property value is read");
	assert.deepEqual(oController.getProp("globalModel", "/userInfo/roles"), ["admin"], "array properties are read as-is");
});

QUnit.test("initializeMenu creates the global menu once and opens it by the event source", function (assert) {
	const oButton = new Button({ text: "menu" });
	aCreatedControls.push(oButton);

	const oEvent = {
		getSource: sinon.stub().returns(oButton),
		getParameter: sinon.stub()
	};

	oController.initializeMenu(oEvent as unknown as Parameters<BaseController["initializeMenu"]>[0]);

	const oMenu = (oController as unknown as AnyObject)._oGlobalMenu as Menu;
	const aItems = getMenuItems(oMenu);
	assert.ok(oMenu instanceof Menu, "a sap.m.Menu instance was created");
	assert.strictEqual(aItems.length, 3, "the menu contains three items");
	assert.strictEqual(aItems[0].getText(), "Start", "the first item uses the translated start text");
	assert.strictEqual(aItems[2].getVisible(), true, "the settings item is visible for an admin user");

	oController.initializeMenu(oEvent as unknown as Parameters<BaseController["initializeMenu"]>[0]);
	assert.strictEqual((oController as unknown as AnyObject)._oGlobalMenu, oMenu, "the menu is created only once and reused");
	assert.strictEqual(oEvent.getSource.callCount, 2, "the menu is opened by the event source on every call");
});

QUnit.test("initializeMenu hides the settings entry for a non admin user", function (assert) {
	oGlobalModel.setProperty("/userInfo/roles", ["User"]);

	const oButton = new Button({ text: "menu" });
	aCreatedControls.push(oButton);
	const oEvent = { getSource: sinon.stub().returns(oButton), getParameter: sinon.stub() };

	oController.initializeMenu(oEvent as unknown as Parameters<BaseController["initializeMenu"]>[0]);

	const oMenu = (oController as unknown as AnyObject)._oGlobalMenu as Menu;
	assert.strictEqual(getMenuItems(oMenu)[2].getVisible(), false, "the settings item is hidden for a non admin user");
});

QUnit.test("toggleMessageView delegates to the message service", function (assert) {
	const oMessageService = (oController as unknown as AnyObject)._messageService;
	const oEvent = { getSource: sinon.stub(), getParameter: sinon.stub() };

	oController.toggleMessageView(oEvent as unknown as Parameters<BaseController["toggleMessageView"]>[0]);

	assert.strictEqual(oMessageService.toggleMessageView.callCount, 1, "toggleMessageView was delegated once");
	assert.strictEqual(oMessageService.toggleMessageView.getCall(0).args[0], oEvent, "the original event is forwarded");
});
