// @ts-ignore -- UI5 ships sinon as a module without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import BaseController from "cap_try_ts/controller/BaseController";
import DialogHandler from "cap_try_ts/controller/DialogHandler";
import JSONModel from "sap/ui/model/json/JSONModel";
import Button from "sap/m/Button";
import Menu from "sap/m/Menu";
import MenuItem from "sap/m/MenuItem";
import Event from "sap/ui/base/Event";
import Model from "sap/ui/model/Model";
import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import Router from "sap/ui/core/routing/Router";
import ResourceBundle from "sap/base/i18n/ResourceBundle";

type AnyRecord = Record<string, unknown>;

interface StubLike {
	(...args: unknown[]): unknown;
	callCount: number;
	firstCall: { args: unknown[] };
	returns(vValue: unknown): StubLike;
	returnsArg(iIndex: number): StubLike;
	withArgs(...args: unknown[]): StubLike;
}

interface SandboxLike {
	stub(oTarget?: unknown, sMethod?: string): StubLike;
	restore(): void;
}

interface FakeView {
	setBusy(bBusy: boolean): void;
	getBusy(): boolean;
	setModel(oModel?: unknown, sName?: string): void;
	getModel(sName?: string): unknown;
	byId(sId: string): unknown;
	destroy(): void;
}

interface TestHooks {
	oSandbox: SandboxLike;
	oController: BaseController;
	oGlobalModel: JSONModel;
	oODataModel: AnyRecord;
	oComponent: AnyRecord;
	oView: FakeView;
	oButton: Button;
	oRouter: AnyRecord;
	oResourceBundle: AnyRecord;
	oDialogHandler: DialogHandler;
	oGetTextStub: StubLike;
	oNavToStub: StubLike;
	oRefreshStub: StubLike;
	oBindContextStub: StubLike;
	oBindListStub: StubLike;
	oRequestContextsResult: unknown[];
	oRequestObjectResult: AnyRecord;
}

QUnit.module("cap_try_ts.controller.BaseController", {
	beforeEach: function (this: TestHooks) {
		this.oSandbox = sinon.sandbox.create() as SandboxLike;

		this.oGlobalModel = new JSONModel({
			selectedCompany: { ID: "old-company" },
			selectedCart: { ID: "old-cart" },
			userInfo: { id: "alice", roles: ["admin"] }
		});

		this.oRequestContextsResult = [{ id: "ctx1" }, { id: "ctx2" }];
		this.oRequestObjectResult = { ID: "entity-1", name: "Entity One" };

		const oBoundContext = {
			getObject: () => ({ id: "alice", roles: ["admin", "User"] })
		};

		const oContextBinding = {
			invoke: () => Promise.resolve(),
			getBoundContext: () => oBoundContext,
			requestObject: () => Promise.resolve(this.oRequestObjectResult)
		};

		const oListBinding = {
			requestContexts: () => Promise.resolve(this.oRequestContextsResult)
		};

		this.oBindContextStub = sinon.stub() as StubLike;
		this.oBindContextStub.returns(oContextBinding);
		this.oBindListStub = sinon.stub() as StubLike;
		this.oBindListStub.returns(oListBinding);
		this.oRefreshStub = sinon.stub() as StubLike;

		this.oODataModel = {
			bindContext: this.oBindContextStub,
			bindList: this.oBindListStub,
			refresh: this.oRefreshStub
		};

		this.oGetTextStub = sinon.stub() as StubLike;
		this.oGetTextStub.returnsArg(0);
		this.oResourceBundle = {
			getText: this.oGetTextStub
		};

		const oResourceModel = {
			getResourceBundle: () => this.oResourceBundle
		};

		this.oNavToStub = sinon.stub() as StubLike;
		this.oRouter = {
			navTo: this.oNavToStub
		};

		let bViewBusy = false;
		this.oView = {
			setBusy: (bBusy: boolean) => {
				bViewBusy = bBusy;
			},
			getBusy: () => bViewBusy,
			setModel: () => undefined,
			getModel: () => undefined,
			byId: () => undefined,
			destroy: () => undefined
		};

		this.oButton = new Button({ text: "anchor" });

		const oGetModelStub = sinon.stub() as StubLike;
		oGetModelStub.returns(this.oODataModel);
		oGetModelStub.withArgs(undefined).returns(this.oODataModel);
		oGetModelStub.withArgs("globalModel").returns(this.oGlobalModel);
		oGetModelStub.withArgs("i18n").returns(oResourceModel);

		this.oComponent = {
			getModel: oGetModelStub,
			getRouter: () => this.oRouter
		};

		this.oDialogHandler = { marker: "dialog-handler" } as unknown as DialogHandler;

		this.oController = new BaseController("cap_try_ts.controller.BaseController");
		this.oSandbox.stub(this.oController, "getOwnerComponent").returns(this.oComponent);
		this.oSandbox.stub(this.oController, "getView").returns(this.oView);
		// The menu is opened by a control that is never rendered in the test page.
		this.oSandbox.stub(Menu.prototype, "openBy");

		// Wire the private collaborators the public API delegates to.
		const oInternals = this.oController as unknown as AnyRecord;
		oInternals._i18n = this.oResourceBundle;
		oInternals._oRouter = this.oRouter;
		oInternals._oDialogHandler = this.oDialogHandler;
		oInternals._messageService = {
			addMessage: sinon.stub(),
			deleteMessages: sinon.stub(),
			toggleMessageView: sinon.stub()
		};
	},
	afterEach: function (this: TestHooks) {
		const oMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu | undefined;
		if (oMenu) {
			oMenu.destroy();
		}
		this.oButton.destroy();
		this.oGlobalModel.destroy();
		this.oSandbox.restore();
		this.oController.destroy();
	}
});

QUnit.test("getRouter returns the router resolved from the owner component", function (this: TestHooks, assert: Assert) {
	const oResult = this.oController.getRouter();

	assert.strictEqual(oResult, this.oRouter as unknown as Router, "the stored router instance is returned");
});

QUnit.test("getDialogHandler returns the dialog handler instance", function (this: TestHooks, assert: Assert) {
	assert.strictEqual(this.oController.getDialogHandler(), this.oDialogHandler, "the stored dialog handler is returned");
});

QUnit.test("getI18n returns the resource bundle", function (this: TestHooks, assert: Assert) {
	assert.strictEqual(this.oController.getI18n(), this.oResourceBundle as unknown as ResourceBundle,
		"the stored resource bundle is returned");
});

QUnit.test("getI18nText delegates to ResourceBundle#getText", function (this: TestHooks, assert: Assert) {
	this.oGetTextStub.withArgs("menu_start").returns("Start");

	const sText = this.oController.getI18nText("menu_start", ["p1"]);

	assert.strictEqual(sText, "Start", "the bundle text is returned");
	assert.strictEqual(this.oGetTextStub.callCount, 1, "getText was called exactly once");
	assert.strictEqual(this.oGetTextStub.firstCall.args[0], "menu_start", "the key was forwarded");
	assert.deepEqual(this.oGetTextStub.firstCall.args[1], ["p1"], "the parameters were forwarded");
});

QUnit.test("getModel without alias returns the default (OData) model", function (this: TestHooks, assert: Assert) {
	const oModel = this.oController.getModel();

	assert.strictEqual(oModel, this.oODataModel as unknown as Model, "the default model is returned");
});

QUnit.test("getModel with alias returns the named model", function (this: TestHooks, assert: Assert) {
	const oModel = this.oController.getModel("globalModel");

	assert.strictEqual(oModel, this.oGlobalModel as unknown as Model, "the named model is returned");
});

QUnit.test("setProp writes the value into the named JSON model", function (this: TestHooks, assert: Assert) {
	this.oController.setProp("globalModel", "/selectedCompany", { ID: "c-42", name: "ACME" });

	assert.deepEqual(this.oGlobalModel.getProperty("/selectedCompany"), { ID: "c-42", name: "ACME" },
		"the property was set on the model");
});

QUnit.test("getProp reads the value from the named JSON model", function (this: TestHooks, assert: Assert) {
	this.oGlobalModel.setProperty("/selectedCart", { ID: "cart-7" });

	const oValue = this.oController.getProp("globalModel", "/selectedCart") as AnyRecord;

	assert.deepEqual(oValue, { ID: "cart-7" }, "the stored value is returned");
	assert.strictEqual(this.oController.getProp("globalModel", "/userInfo/id") as string, "alice",
		"nested paths are resolved");
});

QUnit.test("initializeMenu creates a menu with three entries and opens it by the event source", function (this: TestHooks, assert: Assert) {
	const oEvent = {
		getSource: () => this.oButton
	} as unknown as Event;

	this.oController.initializeMenu(oEvent);

	const oMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu;
	assert.ok(oMenu instanceof Menu, "a Menu instance was created and cached");
	assert.strictEqual(oMenu.getItems().length, 3, "the menu has three items");
	assert.strictEqual((oMenu.getItems()[0] as MenuItem).getText(), "menu_start", "the first item uses the i18n key");
	assert.strictEqual((oMenu.getItems()[1] as MenuItem).getText(), "menu_reports", "the second item uses the i18n key");
	assert.strictEqual((oMenu.getItems()[2] as MenuItem).getVisible(), true,
		"the settings entry is visible for an admin user");
});

QUnit.test("initializeMenu reuses the cached menu on a second call", function (this: TestHooks, assert: Assert) {
	const oEvent = {
		getSource: () => this.oButton
	} as unknown as Event;

	this.oController.initializeMenu(oEvent);
	const oFirstMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu;

	this.oController.initializeMenu(oEvent);
	const oSecondMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu;

	assert.strictEqual(oSecondMenu, oFirstMenu, "the same menu instance is reused");
});

QUnit.test("initializeMenu hides the settings entry for a non-admin user", function (this: TestHooks, assert: Assert) {
	this.oGlobalModel.setProperty("/userInfo", { id: "bob", roles: ["User"] });
	const oEvent = {
		getSource: () => this.oButton
	} as unknown as Event;

	this.oController.initializeMenu(oEvent);

	const oMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu;
	assert.strictEqual((oMenu.getItems()[2] as MenuItem).getVisible(), false,
		"the settings entry is hidden without the admin role");
});

QUnit.test("initializeMenu itemSelected navigates to the route matching the selected item", function (this: TestHooks, assert: Assert) {
	const oEvent = {
		getSource: () => this.oButton
	} as unknown as Event;
	this.oController.initializeMenu(oEvent);

	const oMenu = (this.oController as unknown as AnyRecord)._oGlobalMenu as Menu;
	const oReportsItem = oMenu.getItems()[1] as MenuItem;

	(oMenu as unknown as { fireEvent: (sEventId: string, mParameters?: object) => void })
		.fireEvent("itemSelected", { item: oReportsItem });

	assert.strictEqual(this.oNavToStub.callCount, 1, "navTo was called once");
	assert.strictEqual(this.oNavToStub.firstCall.args[0], "Reports", "the Reports route was requested");
});

QUnit.test("toggleMessageView delegates to the message service", function (this: TestHooks, assert: Assert) {
	const oMessageService = (this.oController as unknown as AnyRecord)._messageService as AnyRecord;
	const oEvent = { id: "toggle-event" } as unknown as Event;

	this.oController.toggleMessageView(oEvent);

	const oToggleStub = oMessageService.toggleMessageView as StubLike;
	assert.strictEqual(oToggleStub.callCount, 1, "toggleMessageView was called once");
	assert.strictEqual(oToggleStub.firstCall.args[0], oEvent, "the event was forwarded unchanged");
});

QUnit.test("_getEntityContexts builds the keyed path and resolves the entity", function (this: TestHooks, assert: Assert) {
	const done = assert.async();

	void this.oController._getEntityContexts("/Products", "key-1").then((oResult: unknown) => {
		assert.strictEqual(this.oBindContextStub.callCount, 1, "bindContext was called once");
		assert.strictEqual(this.oBindContextStub.firstCall.args[0], "/Products('key-1')",
			"the keyed path was built correctly");
		assert.deepEqual(oResult, this.oRequestObjectResult as unknown, "the requested object is returned");
		done();
	});
});

QUnit.test("_getEntitySetContexts forwards binding arguments and returns the contexts", function (this: TestHooks, assert: Assert) {
	const done = assert.async();
	const oSorter = new Sorter("name", false);
	const oFilter = new Filter("name", "EQ", "x");
	const oParameters = { $count: true };

	void this.oController
		._getEntitySetContexts("/Orders", undefined, oSorter, oFilter, oParameters)
		.then((aContexts) => {
			assert.strictEqual(this.oBindListStub.callCount, 1, "bindList was called once");
			const aArgs = this.oBindListStub.firstCall.args;
			assert.strictEqual(aArgs[0], "/Orders", "the path was forwarded");
			assert.strictEqual(aArgs[1], undefined, "no context was forwarded");
			assert.strictEqual(aArgs[2], oSorter as unknown, "the sorter was forwarded");
			assert.strictEqual(aArgs[3], oFilter as unknown, "the filter was forwarded");
			assert.deepEqual(aArgs[4], oParameters as unknown, "the parameters were forwarded");
			assert.deepEqual(aContexts as unknown[], this.oRequestContextsResult, "the requested contexts are returned");
			done();
		});
});

QUnit.test("_onObjectMatched refreshes the OData model and resets the global selections", function (this: TestHooks, assert: Assert) {
	this.oController._onObjectMatched();

	assert.strictEqual(this.oRefreshStub.callCount, 1, "the default model was refreshed");
	assert.deepEqual(this.oGlobalModel.getProperty("/selectedCompany"), {},
		"the selected company was cleared");
	assert.deepEqual(this.oGlobalModel.getProperty("/selectedCart"), {},
		"the selected cart was cleared");
});

QUnit.test("_getUserInfo stores the invoked user info and clears the busy state", function (this: TestHooks, assert: Assert) {
	const done = assert.async();

	void this.oController._getUserInfo().then(() => {
		assert.strictEqual(this.oBindContextStub.firstCall.args[0], "/getUserInfo(...)",
			"the getUserInfo function import was bound");
		assert.deepEqual(this.oGlobalModel.getProperty("/userInfo"), { id: "alice", roles: ["admin", "User"] },
			"the user info was written into the global model");
		assert.strictEqual(this.oView.getBusy(), false, "the view is no longer busy");
		done();
	});
});

QUnit.test("_addMessage and _deleteMessages delegate to the message service", function (this: TestHooks, assert: Assert) {
	const oMessageService = (this.oController as unknown as AnyRecord)._messageService as AnyRecord;
	const oMessage = { message: "boom", type: "Error" };

	this.oController._addMessage(oMessage);
	this.oController._deleteMessages();

	const oAddStub = oMessageService.addMessage as StubLike;
	const oDeleteStub = oMessageService.deleteMessages as StubLike;
	assert.strictEqual(oAddStub.callCount, 1, "addMessage was called once");
	assert.strictEqual(oAddStub.firstCall.args[0], oMessage as unknown, "the message was forwarded unchanged");
	assert.strictEqual(oDeleteStub.callCount, 1, "deleteMessages was called once");
});

QUnit.test("the controller exposes its public API", function (this: TestHooks, assert: Assert) {
	const aPublicMethods = ["getRouter", "getDialogHandler", "getI18n", "getI18nText", "getModel",
		"setProp", "getProp", "initializeMenu", "toggleMessageView"];

	aPublicMethods.forEach((sMethod) => {
		assert.strictEqual(typeof (this.oController as unknown as AnyRecord)[sMethod], "function",
			`${sMethod} is implemented`);
	});
});
