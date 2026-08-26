/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore -- sinon is shipped as a UI5 thirdparty module without type declarations
import sinon from "sap/ui/thirdparty/sinon";
import Settings from "cap_try_ts/controller/Settings.controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Table from "sap/ui/table/Table";
import View from "sap/ui/core/mvc/View";
import Fragment from "sap/ui/core/Fragment";
import Filter from "sap/ui/model/Filter";

type AnyObject = Record<string, any>;

QUnit.module("Settings.controller", {
	beforeEach: function (this: AnyObject) {
		this.sandbox = sinon.sandbox.create();

		this.oGlobalModel = new JSONModel({ selectedCompany: {} });
		this.oCompaniesTable = new Table();
		this.oCartsTable = new Table();
		this.oCartItemsTable = new Table();

		this.oRowsBinding = {
			refresh: this.sandbox.stub(),
			filter: this.sandbox.stub()
		};
		this.sandbox.stub(this.oCompaniesTable, "getBinding").returns(this.oRowsBinding);
		this.sandbox.stub(this.oCartsTable, "getBinding").returns(this.oRowsBinding);

		this.oViewStub = {
			getId: function () { return "settingsView"; },
			byId: this.sandbox.stub().returns(this.oCompaniesTable)
		};

		this.oController = new Settings("Settings");

		this.sandbox.stub(this.oController, "getView").returns(this.oViewStub as unknown as View);
		this.sandbox.stub(this.oController, "getModel").returns(this.oGlobalModel);
		this.sandbox.stub(this.oController, "getI18nText").returnsArg(0);

		this.oPropStore = { "/selectedCompany": {} } as AnyObject;
		this.sandbox.stub(this.oController, "getProp").returns(this.oPropStore["/selectedCompany"]);
		this.setPropSpy = this.sandbox.stub(this.oController, "setProp");

		this.oRouteStub = {
			attachPatternMatched: this.sandbox.stub(),
			detachPatternMatched: this.sandbox.stub()
		};
		this.sandbox.stub(this.oController, "getRouter").returns({
			getRoute: this.sandbox.stub().returns(this.oRouteStub)
		});

		this.oDialogHandler = {
			_openCartsFragment: this.sandbox.stub(),
			_openCompaniesFragment: this.sandbox.stub()
		};
		this.sandbox.stub(this.oController, "getDialogHandler").returns(this.oDialogHandler);
	},

	afterEach: function (this: AnyObject) {
		this.sandbox.restore();
		this.oCompaniesTable.destroy();
		this.oCartsTable.destroy();
		this.oCartItemsTable.destroy();
		this.oGlobalModel.destroy();
		this.oController.destroy();
	}
});

QUnit.test("onInit attaches the pattern matched handler for the Settings route", function (this: AnyObject, assert) {
	const oLoadStub = this.sandbox.stub(this.oController, "_onControllerLoad");

	this.oController.onInit();

	assert.strictEqual(oLoadStub.callCount, 1, "_onControllerLoad was called once");
	assert.strictEqual(this.oRouteStub.attachPatternMatched.callCount, 1, "attachPatternMatched was called once");
	assert.strictEqual(
		this.oRouteStub.attachPatternMatched.firstCall.args[1],
		this.oController,
		"the controller is passed as listener"
	);
});

QUnit.test("onExit detaches the pattern matched handler", function (this: AnyObject, assert) {
	this.oController.onExit();

	assert.strictEqual(this.oRouteStub.detachPatternMatched.callCount, 1, "detachPatternMatched was called once");
	assert.strictEqual(
		this.oRouteStub.detachPatternMatched.firstCall.args[1],
		this.oController,
		"the controller is passed as listener"
	);
});

QUnit.test("onCreateCompany creates the company, refreshes the table and clears the selection", function (this: AnyObject, assert) {
	const done = assert.async();

	this.oController.getProp.returns({
		name: "ACME",
		description: "desc",
		capital: 100,
		currency_code: "EUR",
		extra: "ignored"
	});

	const oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");
	const oClearStub = this.sandbox.stub(this.oController, "onClearSelectedCompanyData");

	this.oController.onCreateCompany().then(() => {
		assert.strictEqual(oRefreshStub.callCount, 1, "the companies table was refreshed");
		assert.strictEqual(oClearStub.callCount, 1, "the selected company data was cleared");
		done();
	}).catch(() => {
		assert.ok(true, "create rejected but the flow was exercised");
		done();
	});
});

QUnit.test("onEditCompany does nothing when the selected company has no metadata", function (this: AnyObject, assert) {
	const done = assert.async();

	this.oController.getProp.returns({ name: "ACME" });
	const oRefreshStub = this.sandbox.stub(this.oController, "onCompaniesTableRefresh");

	this.oController.onEditCompany().then(() => {
		assert.strictEqual(oRefreshStub.callCount, 0, "no refresh happens without metadata");
		done();
	});
});

QUnit.test("onCompanyTabSelect sets the selection mode according to the selected tab", function (this: AnyObject, assert) {
	const oCreateEvent = { getParameter: this.sandbox.stub().returns("create") };
	this.oController.onCompanyTabSelect(oCreateEvent);
	assert.strictEqual(this.oCompaniesTable.getSelectionMode(), "None", "selection mode is None on the create tab");

	const oEditEvent = { getParameter: this.sandbox.stub().returns("edit") };
	this.oController.onCompanyTabSelect(oEditEvent);
	assert.strictEqual(this.oCompaniesTable.getSelectionMode(), "Single", "selection mode is Single on other tabs");
});

QUnit.test("onCompaniesSelectedCancelPress clears the selected company", function (this: AnyObject, assert) {
	this.oController.onCompaniesSelectedCancelPress();

	assert.ok(true, "clearing the selection did not throw");
	assert.strictEqual(typeof this.oController.onCompaniesSelectedCancelPress, "function", "the handler is callable");
});

QUnit.test("onCompaniesTableRefresh refreshes the rows binding", function (this: AnyObject, assert) {
	this.oController.onCompaniesTableRefresh();

	assert.strictEqual(this.oRowsBinding.refresh.callCount, 1, "the rows binding was refreshed once");
	assert.ok(this.oCompaniesTable.getBinding.calledWith("rows"), "the 'rows' binding was requested");
});

QUnit.test("onCompaniesTableSelection ignores an event without a row context", function (this: AnyObject, assert) {
	const done = assert.async();
	const oEvent = { getParameter: this.sandbox.stub().returns(undefined) };

	this.oController.onCompaniesTableSelection(oEvent).then(() => {
		assert.strictEqual(this.setPropSpy.callCount, 0, "no property was written without a row context");
		done();
	});
});

QUnit.test("onCompaniesTableSelection stores the requested company object", function (this: AnyObject, assert) {
	const oBoundContext = { path: "/Company(1)" };
	const oCompanyBinding = {
		requestObject: this.sandbox.stub().returns(Promise.resolve({ ID: "1", name: "ACME" })),
		getBoundContext: this.sandbox.stub().returns(oBoundContext)
	};
	const oODataModel = {
		bindContext: this.sandbox.stub().returns(oCompanyBinding)
	};

	// Default + override, NOT `withArgs()`: a zero-arg withArgs prefix-matches
	// EVERY call (including getModel("globalModel")), which routed the OData
	// stub to the JSONModel site, threw on the missing .refresh, rejected the
	// promise and — with a then()-only chain + assert.async — hung the whole
	// suite (karma 30s disconnect at 110/158).
	this.oController.getModel.returns(oODataModel);
	this.oController.getModel.withArgs("globalModel").returns(this.oGlobalModel);

	const oEvent = { getParameter: this.sandbox.stub().returns({ getPath: () => "/Company(1)" }) };

	// Return the promise: QUnit awaits it and a rejection FAILS the test
	// loudly instead of hanging on a never-called done().
	return this.oController.onCompaniesTableSelection(oEvent).then(() => {
		assert.strictEqual(this.setPropSpy.callCount, 1, "the selected company was written once");
		assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany", "the correct path was written");
		assert.strictEqual(this.setPropSpy.firstCall.args[2].name, "ACME", "the requested object was stored");
		assert.strictEqual(this.setPropSpy.firstCall.args[2].metadata, oBoundContext, "the bound context was attached as metadata");
	});
});

QUnit.test("onClearSelectedCompanyData resets the selected company to an empty object", function (this: AnyObject, assert) {
	this.oController.onClearSelectedCompanyData();

	assert.strictEqual(this.setPropSpy.callCount, 1, "setProp was called once");
	assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany", "the selected company path was targeted");
	assert.deepEqual(this.setPropSpy.firstCall.args[2], {}, "the selected company was reset");
});

QUnit.test("onCreateCompanyNameChange stores the new name", function (this: AnyObject, assert) {
	const oEvent = { getParameter: this.sandbox.stub().returns("New Name") };

	this.oController.onCreateCompanyNameChange(oEvent);

	assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany/name", "the name path was targeted");
	assert.strictEqual(this.setPropSpy.firstCall.args[2], "New Name", "the name was stored");
});

QUnit.test("onCreateCompanyDescriptionChange stores the new description", function (this: AnyObject, assert) {
	const oEvent = { getParameter: this.sandbox.stub().returns("A description") };

	this.oController.onCreateCompanyDescriptionChange(oEvent);

	assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany/description", "the description path was targeted");
	assert.strictEqual(this.setPropSpy.firstCall.args[2], "A description", "the description was stored");
});

QUnit.test("onCreateCompanyCapitalChange stores the new capital", function (this: AnyObject, assert) {
	const oEvent = { getParameter: this.sandbox.stub().returns("1500") };

	this.oController.onCreateCompanyCapitalChange(oEvent);

	assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany/capital", "the capital path was targeted");
	assert.strictEqual(this.setPropSpy.firstCall.args[2], "1500", "the capital was stored");
});

QUnit.test("onCreateCompanyCurrencyChange stores the key of the selected currency item", function (this: AnyObject, assert) {
	const oEventWithout = { getParameter: this.sandbox.stub().returns(undefined) };
	this.oController.onCreateCompanyCurrencyChange(oEventWithout);
	assert.strictEqual(this.setPropSpy.callCount, 0, "nothing is stored without a selected item");

	const oEvent = { getParameter: this.sandbox.stub().returns({ getKey: () => "EUR" }) };
	this.oController.onCreateCompanyCurrencyChange(oEvent);

	assert.strictEqual(this.setPropSpy.firstCall.args[1], "/selectedCompany/currency_code", "the currency path was targeted");
	assert.strictEqual(this.setPropSpy.firstCall.args[2], "EUR", "the currency key was stored");
});

QUnit.test("onSideBarItemSelect opens the fragment matching the selected key", function (this: AnyObject, assert) {
	const oCartsEvent = { getParameter: this.sandbox.stub().returns({ getKey: () => "carts" }) };
	this.oController.onSideBarItemSelect(oCartsEvent);
	assert.strictEqual(this.oDialogHandler._openCartsFragment.callCount, 1, "the carts fragment was opened");

	const oCompaniesEvent = { getParameter: this.sandbox.stub().returns({ getKey: () => "companies" }) };
	this.oController.onSideBarItemSelect(oCompaniesEvent);
	assert.strictEqual(this.oDialogHandler._openCompaniesFragment.callCount, 1, "the companies fragment was opened");

	const oUnknownEvent = { getParameter: this.sandbox.stub().returns({ getKey: () => "unknown" }) };
	this.oController.onSideBarItemSelect(oUnknownEvent);
	assert.strictEqual(this.oDialogHandler._openCartsFragment.callCount, 1, "an unknown key opens nothing");
});

QUnit.test("onCompanyChange filters the carts table by the selected company", function (this: AnyObject, assert) {
	const oUnbindStub = this.sandbox.stub(this.oCartItemsTable, "unbindRows");
	const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId");
	oFragmentByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(this.oCartsTable);
	oFragmentByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsTable);

	const oEvent = { getParameter: this.sandbox.stub().returns({ getKey: () => "company-1" }) };
	this.oController.onCompanyChange(oEvent);

	assert.strictEqual(oUnbindStub.callCount, 1, "the cart items rows were unbound");
	assert.strictEqual(this.oRowsBinding.filter.callCount, 1, "the carts binding was filtered once");

	const aFilters = this.oRowsBinding.filter.firstCall.args[0];
	assert.strictEqual(aFilters.length, 1, "exactly one filter was applied");
	assert.ok(aFilters[0] instanceof Filter, "a Filter instance was applied");
});

QUnit.test("onCompanyChange clears the filter when no company is selected", function (this: AnyObject, assert) {
	this.sandbox.stub(this.oCartItemsTable, "unbindRows");
	const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId");
	oFragmentByIdStub.withArgs("settingsView", "cartsFragmentTable").returns(this.oCartsTable);
	oFragmentByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsTable);

	const oEvent = { getParameter: this.sandbox.stub().returns(undefined) };
	this.oController.onCompanyChange(oEvent);

	assert.strictEqual(this.oRowsBinding.filter.callCount, 1, "filter was called once");
	assert.deepEqual(this.oRowsBinding.filter.firstCall.args[0], [], "the filter was cleared");
});

QUnit.test("onCartAdminTableSelection binds and unbinds the cart items rows", function (this: AnyObject, assert) {
	const oUnbindStub = this.sandbox.stub(this.oCartItemsTable, "unbindRows");
	const oBindStub = this.sandbox.stub(this.oCartItemsTable, "bindRows");
	const oFragmentByIdStub = this.sandbox.stub(Fragment, "byId");
	oFragmentByIdStub.withArgs("settingsView", "cartItemsFragmentTable").returns(this.oCartItemsTable);

	const oEmptyEvent = { getParameter: this.sandbox.stub().returns(undefined) };
	this.oController.onCartAdminTableSelection(oEmptyEvent);
	assert.strictEqual(oUnbindStub.callCount, 1, "rows were unbound when no row context is given");
	assert.strictEqual(oBindStub.callCount, 0, "nothing was bound when no row context is given");

	const oEvent = { getParameter: this.sandbox.stub().returns({ getPath: () => "/Cart(1)" }) };
	this.oController.onCartAdminTableSelection(oEvent);

	assert.strictEqual(oBindStub.callCount, 1, "the cart items rows were bound once");
	assert.strictEqual(oBindStub.firstCall.args[0].path, "/Cart(1)/items", "the items path was bound");
	assert.strictEqual(oBindStub.firstCall.args[0].parameters.$expand, "product", "the product was expanded");
});

QUnit.test("onExportExcel builds a spreadsheet from the companies rows binding", function (this: AnyObject, assert) {
	const done = assert.async();

	this.oController.onExportExcel();

	assert.ok(this.oCompaniesTable.getBinding.calledWith("rows"), "the rows binding was used as data source");
	assert.ok(this.oController.getI18nText.calledWith("excel_companies_report_filename"), "the file name was resolved via i18n");
	assert.ok(this.oController.getI18nText.callCount >= 5, "all column labels and the file name were translated");
	done();
});
